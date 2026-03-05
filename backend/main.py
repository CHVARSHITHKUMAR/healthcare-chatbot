from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import sessionmaker, declarative_base, relationship, Session
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from PIL import Image
import PyPDF2
import google.generativeai as genai
import os
import io

# =========================
# CONFIG
# =========================

SECRET_KEY = "supersecretkey"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_URL = f"sqlite:///{os.path.join(BASE_DIR, 'medical_history.db')}"

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# =========================
# GEMINI SETUP
# =========================

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-2.5-flash")

def ask_gemini(prompt: str):
    response = model.generate_content(prompt)
    return response.text

# =========================
# APP INIT
# =========================

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"status": "Healthcare AI API running"}

# =========================
# DATABASE
# =========================

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password = Column(String)

    history = relationship("MedicalHistory", back_populates="owner")

class MedicalHistory(Base):
    __tablename__ = "medical_history"

    id = Column(Integer, primary_key=True, index=True)
    input_type = Column(String)
    user_input = Column(String)
    ai_response = Column(String)
    severity_score = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    user_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="history")

Base.metadata.create_all(bind=engine)

# =========================
# AUTH
# =========================

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def hash_password(password: str):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):

    credentials_exception = HTTPException(
        status_code=401,
        detail="Invalid credentials"
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")

        if username is None:
            raise credentials_exception

    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.username == username).first()

    if user is None:
        raise credentials_exception

    return user

# =========================
# SAVE HISTORY
# =========================

def save_to_db(user, input_type, user_input, ai_response):

    db = SessionLocal()

    record = MedicalHistory(
        input_type=input_type,
        user_input=user_input,
        ai_response=ai_response,
        severity_score=0,
        user_id=user.id
    )

    db.add(record)
    db.commit()
    db.close()

# =========================
# REQUEST MODELS
# =========================

from pydantic import BaseModel

class RegisterRequest(BaseModel):
    username: str
    password: str

class LoginRequest(BaseModel):
    username: str
    password: str

# =========================
# ROUTES
# =========================

@app.post("/register")
def register(data: RegisterRequest, db: Session = Depends(get_db)):

    existing = db.query(User).filter(User.username == data.username).first()

    if existing:
        raise HTTPException(status_code=400, detail="User already exists")

    new_user = User(
        username=data.username,
        password=hash_password(data.password)
    )

    db.add(new_user)
    db.commit()

    return {"message": "User registered successfully"}

@app.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):

    user = db.query(User).filter(User.username == data.username).first()

    if not user or not verify_password(data.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": data.username})

    return {"access_token": token}

@app.post("/chat")
def chat(message: str, user: User = Depends(get_current_user)):

    ai_response = ask_gemini(message)

    save_to_db(user, "text", message, ai_response)

    return {"reply": ai_response}

@app.post("/analyze-image")
def analyze_image(file: UploadFile = File(...), user: User = Depends(get_current_user)):

    try:
        contents = file.file.read()
        image = Image.open(io.BytesIO(contents))

        response = model.generate_content([
            "Analyze this medical image and describe possible condition clearly.",
            image
        ])

        ai_response = response.text

        save_to_db(user, "image", "Image Uploaded", ai_response)

        return {"reply": ai_response}

    except Exception as e:
        return {"reply": f"Image processing failed: {str(e)}"}

@app.post("/analyze-pdf")
def analyze_pdf(file: UploadFile = File(...), user: User = Depends(get_current_user)):

    try:
        contents = file.file.read()
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(contents))

        text = ""

        for page in pdf_reader.pages:
            text += page.extract_text() or ""

        if not text.strip():
            return {"reply": "No readable text found in PDF."}

        ai_response = ask_gemini(
            f"Analyze this medical report and summarize findings clearly:\n\n{text}"
        )

        save_to_db(user, "pdf", "PDF Uploaded", ai_response)

        return {"reply": ai_response}

    except Exception as e:
        return {"reply": f"PDF processing failed: {str(e)}"}

@app.get("/history")
def get_history(user: User = Depends(get_current_user), db: Session = Depends(get_db)):

    history = db.query(MedicalHistory).filter(
        MedicalHistory.user_id == user.id
    ).all()

    return [
        {
            "input_type": h.input_type,
            "user_input": h.user_input,
            "ai_response": h.ai_response,
            "created_at": h.created_at
        }
        for h in history
    ]
