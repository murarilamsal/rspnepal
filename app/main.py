import hashlib
import os
import secrets
from collections import Counter
from datetime import timedelta, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session, select

from app.content import CORE_COMMITMENTS, CORE_COMMITMENTS_TITLE
from app.database import create_db_and_tables, engine, get_session
from app.models import AuthSession, Feedback, Opinion, Reaction, UserEntry, UserTopic, utc_now
from app.schemas import (
    AuthActivateRequest,
    AuthLoginRequest,
    AuthSessionResponse,
    FeedbackCreate,
    FeedbackResponse,
    HighlightItem,
    OpinionResponse,
    ReactionCreate,
    UserEntryCreate,
    UserEntryResponse,
    UserTopicCreate,
    UserTopicResponse,
    UserTopicUpdate,
)


BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIST_DIR = BASE_DIR / "app" / "static"
UPLOADS_DIR = BASE_DIR / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
ALLOWED_REACTIONS = {"support", "insightful", "urgent"}
ADMIN_USER_ID = "ADMIN-MURARI"
ADMIN_USER_NAME = "Murari Lamsal"
ADMIN_USER_EMAIL = "admin.murari@rsp.local"
ADMIN_USER_PHONE = "0000000000"
ADMIN_DEFAULT_PASSWORD = os.getenv("RSP_ADMIN_PASSWORD", "Murari@RSP2026")
SESSION_DURATION = timedelta(days=7)
ADMIN_BLUEPRINT_POINTS = [
    "Establish a smaller, smarter constitutional and electoral framework that strengthens the rule of law and delivers a more accountable and cost-effective government.",
    "Create a new democratic constitutional basis for electing the Executive President or Prime Minister, with full openness and accessibility for ordinary citizens to participate in leadership.",
    "Restructure Parliament to around 150 members, with 100 in the lower house and 50 in the upper house, and prevent elected MPs from simultaneously serving as ministers so Parliament can independently oversee government and recall ministers involved in corruption.",
    "Reduce the cost of elections by shifting campaigning toward regulated digital platforms, including live debates through social media and public and private media, while phasing out expensive traditional election practices.",
    "Reform the current provincial structure by either abolishing it or making it more democratic and cost-efficient, while giving stronger political and economic authority to local governments.",
    "Establish a powerful anti-corruption commission and strengthen leadership accountability, recognizing that corruption is most effectively controlled when addressed from the top down.",
    "Improve institutional integrity by creating an impartial judicial appointment system free from party influence, and by introducing fair performance evaluation, oversight, and disciplinary mechanisms for public employees.",
]

app = FastAPI(
    title="RSP Nepal Opinion API",
    description="Collects public suggestions, reactions, and uploaded documents for RSP Nepal.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")


@app.on_event("startup")
def on_startup() -> None:
    create_db_and_tables()
    with Session(engine) as session:
        ensure_admin_seed(session)


@app.get("/", include_in_schema=False, response_model=None)
def root():
    index_file = FRONTEND_DIST_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return RedirectResponse(url="/docs")


@app.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/highlights")
def get_highlights() -> dict[str, list[HighlightItem] | str]:
    return {
        "title": CORE_COMMITMENTS_TITLE,
        "items": [HighlightItem(**item) for item in CORE_COMMITMENTS],
    }


def build_opinion_response(opinion: Opinion, session: Session) -> OpinionResponse:
    reactions = session.exec(
        select(Reaction).where(Reaction.opinion_id == opinion.id)
    ).all()
    reaction_counts = Counter(reaction.reaction_type for reaction in reactions)

    return OpinionResponse(
        id=opinion.id,
        name=opinion.name,
        email=opinion.email,
        phone=opinion.phone,
        title=opinion.title,
        message=opinion.message,
        file_name=opinion.file_name,
        file_path=opinion.file_path,
        created_at=opinion.created_at,
        reactions=dict(reaction_counts),
    )


def parse_topics_text(topics_text: str) -> list[str]:
    return [line.strip() for line in topics_text.splitlines() if line.strip()]


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    iterations = 200000
    derived_key = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        iterations,
    )
    return f"pbkdf2_sha256${iterations}${salt}${derived_key.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    if not stored_hash:
        return False

    try:
        algorithm, iterations_text, salt, stored_digest = stored_hash.split("$", 3)
    except ValueError:
        return False

    if algorithm != "pbkdf2_sha256":
        return False

    derived_key = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        int(iterations_text),
    )
    return secrets.compare_digest(derived_key.hex(), stored_digest)


def build_token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def normalize_utc_datetime(value):
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def create_auth_session(user_entry: UserEntry, session: Session) -> AuthSessionResponse:
    token = secrets.token_urlsafe(32)
    expires_at = utc_now() + SESSION_DURATION
    auth_session = AuthSession(
        user_entry_id=user_entry.id,
        token_hash=build_token_hash(token),
        expires_at=expires_at,
    )
    session.add(auth_session)
    session.commit()
    return AuthSessionResponse(token=token, user=user_entry)


def require_password_strength(password: str) -> str:
    normalized_password = password.strip()
    if len(normalized_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long.")
    return normalized_password


def build_user_topic_response(topic: UserTopic, session: Session) -> UserTopicResponse:
    user_entry = session.get(UserEntry, topic.user_entry_id)
    if user_entry is None:
        raise HTTPException(status_code=404, detail="User entry not found")

    return UserTopicResponse(
        id=topic.id,
        user_entry_id=topic.user_entry_id,
        user_id=user_entry.user_id,
        user_name=user_entry.name,
        user_email=user_entry.email,
        points=parse_topics_text(topic.topics_text),
        created_at=topic.created_at,
    )


def build_feedback_response(feedback: Feedback) -> FeedbackResponse:
    return FeedbackResponse(
        id=feedback.id,
        user_topic_id=feedback.user_topic_id,
        topic_label=feedback.topic_label,
        feedback_text=feedback.feedback_text,
        user_name=feedback.user_name,
        user_email=feedback.user_email,
        created_at=feedback.created_at,
    )


def ensure_admin_seed(session: Session) -> None:
    admin_entry = session.exec(
        select(UserEntry).where(UserEntry.user_id == ADMIN_USER_ID)
    ).first()

    if admin_entry is None:
        admin_entry = UserEntry(
            user_id=ADMIN_USER_ID,
            name=ADMIN_USER_NAME,
            email=ADMIN_USER_EMAIL,
            phone=ADMIN_USER_PHONE,
        )
        session.add(admin_entry)
        session.commit()
        session.refresh(admin_entry)
    else:
        admin_entry.name = ADMIN_USER_NAME
        admin_entry.email = ADMIN_USER_EMAIL
        admin_entry.phone = ADMIN_USER_PHONE
        if not admin_entry.password_hash:
            admin_entry.password_hash = hash_password(ADMIN_DEFAULT_PASSWORD)
        session.add(admin_entry)
        session.commit()
        session.refresh(admin_entry)

    if not admin_entry.password_hash:
        admin_entry.password_hash = hash_password(ADMIN_DEFAULT_PASSWORD)
        session.add(admin_entry)
        session.commit()
        session.refresh(admin_entry)

    admin_topics = session.exec(
        select(UserTopic).where(UserTopic.user_entry_id == admin_entry.id)
    ).all()
    topics_text = "\n".join(ADMIN_BLUEPRINT_POINTS)

    if not admin_topics:
        session.add(UserTopic(user_entry_id=admin_entry.id, topics_text=topics_text))
    else:
        primary_topic = admin_topics[0]
        primary_topic.topics_text = topics_text
        session.add(primary_topic)

        for extra_topic in admin_topics[1:]:
            session.delete(extra_topic)

    session.commit()


def resolve_user_entry_by_lookup(user_lookup: str, session: Session) -> UserEntry | None:
    normalized_lookup = user_lookup.strip()
    if not normalized_lookup:
        return None

    user_by_id = session.exec(
        select(UserEntry).where(UserEntry.user_id == normalized_lookup.upper())
    ).first()
    if user_by_id is not None:
        return user_by_id

    return session.exec(
        select(UserEntry).where(UserEntry.email == normalized_lookup.lower())
    ).first()


def extract_bearer_token(authorization: str | None = Header(default=None)) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Please login first.")

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=401, detail="Please login first.")

    return token


def get_optional_current_user(
    authorization: str | None = Header(default=None),
    session: Session = Depends(get_session),
) -> UserEntry | None:
    if not authorization:
        return None

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return None

    auth_session = session.exec(
        select(AuthSession).where(AuthSession.token_hash == build_token_hash(token))
    ).first()
    if auth_session is None or normalize_utc_datetime(auth_session.expires_at) <= utc_now():
        return None

    return session.get(UserEntry, auth_session.user_entry_id)


def get_current_user(
    token: str = Depends(extract_bearer_token),
    session: Session = Depends(get_session),
) -> UserEntry:
    auth_session = session.exec(
        select(AuthSession).where(AuthSession.token_hash == build_token_hash(token))
    ).first()
    if auth_session is None or normalize_utc_datetime(auth_session.expires_at) <= utc_now():
        raise HTTPException(status_code=401, detail="Please login first.")

    user_entry = session.get(UserEntry, auth_session.user_entry_id)
    if user_entry is None:
        raise HTTPException(status_code=401, detail="Please login first.")

    return user_entry


def require_topic_owner_or_admin(topic: UserTopic, current_user: UserEntry) -> None:
    is_admin = current_user.user_id == ADMIN_USER_ID
    is_owner = current_user.id == topic.user_entry_id

    if not is_admin and not is_owner:
        raise HTTPException(
            status_code=403,
            detail="Only the topic owner or admin can edit or delete this topic.",
        )


@app.post("/api/auth/login", response_model=AuthSessionResponse)
def login_user(payload: AuthLoginRequest, session: Session = Depends(get_session)) -> AuthSessionResponse:
    user_entry = resolve_user_entry_by_lookup(payload.user_lookup, session)
    if user_entry is None:
        raise HTTPException(status_code=401, detail="User ID, email, or password is not correct.")

    if not user_entry.password_hash:
        raise HTTPException(status_code=400, detail="Password is not set for this user. Activate the account first.")

    if not verify_password(payload.password, user_entry.password_hash):
        raise HTTPException(status_code=401, detail="User ID, email, or password is not correct.")

    return create_auth_session(user_entry, session)


@app.post("/api/auth/activate", response_model=AuthSessionResponse)
def activate_user_account(
    payload: AuthActivateRequest,
    session: Session = Depends(get_session),
) -> AuthSessionResponse:
    user_entry = resolve_user_entry_by_lookup(payload.user_lookup, session)
    if user_entry is None or user_entry.phone.strip() != payload.phone.strip():
        raise HTTPException(status_code=401, detail="Your user information is not correct.")

    if user_entry.password_hash:
        raise HTTPException(status_code=400, detail="Password is already set. Please login with your password.")

    user_entry.password_hash = hash_password(require_password_strength(payload.password))
    session.add(user_entry)
    session.commit()
    session.refresh(user_entry)
    return create_auth_session(user_entry, session)


@app.get("/api/opinions", response_model=list[OpinionResponse])
def list_opinions(session: Session = Depends(get_session)) -> list[OpinionResponse]:
    opinions = session.exec(select(Opinion).order_by(Opinion.created_at.desc())).all()
    return [build_opinion_response(opinion, session) for opinion in opinions]


@app.post("/api/opinions", response_model=OpinionResponse, status_code=201)
async def create_opinion(
    name: str = Form(...),
    email: str = Form(...),
    phone: str = Form(...),
    title: str = Form(...),
    message: str = Form(...),
    attachment: UploadFile | None = File(default=None),
    session: Session = Depends(get_session),
) -> OpinionResponse:
    stored_file_name = None
    stored_file_path = None

    if attachment and attachment.filename:
        suffix = Path(attachment.filename).suffix
        stored_file_name = attachment.filename
        saved_name = f"{uuid4().hex}{suffix}"
        destination = UPLOADS_DIR / saved_name
        content = await attachment.read()
        destination.write_bytes(content)
        stored_file_path = f"/uploads/{saved_name}"

    opinion = Opinion(
        name=name.strip(),
        email=email.strip(),
        phone=phone.strip(),
        title=title.strip(),
        message=message.strip(),
        file_name=stored_file_name,
        file_path=stored_file_path,
    )

    session.add(opinion)
    session.commit()
    session.refresh(opinion)

    return build_opinion_response(opinion, session)


@app.post("/api/opinions/{opinion_id}/reactions", response_model=OpinionResponse)
def add_reaction(
    opinion_id: int,
    payload: ReactionCreate,
    session: Session = Depends(get_session),
) -> OpinionResponse:
    opinion = session.get(Opinion, opinion_id)
    if opinion is None:
        raise HTTPException(status_code=404, detail="Opinion not found")

    reaction_type = payload.reaction_type.strip().lower()
    if reaction_type not in ALLOWED_REACTIONS:
        raise HTTPException(status_code=400, detail="Unsupported reaction type")

    reaction = Reaction(opinion_id=opinion_id, reaction_type=reaction_type)
    session.add(reaction)
    session.commit()

    return build_opinion_response(opinion, session)


@app.post("/api/user-entries", response_model=AuthSessionResponse, status_code=201)
def create_user_entry(
    payload: UserEntryCreate,
    session: Session = Depends(get_session),
) -> AuthSessionResponse:
    normalized_email = payload.email.strip().lower()
    existing_entry = session.exec(
        select(UserEntry).where(UserEntry.email == normalized_email)
    ).first()
    if existing_entry is not None:
        raise HTTPException(status_code=400, detail="Email is already registered")

    generated_user_id = f"RSPU-{uuid4().hex[:8].upper()}"
    entry = UserEntry(
        user_id=generated_user_id,
        name=payload.name.strip(),
        email=normalized_email,
        phone=payload.phone.strip(),
        password_hash=hash_password(require_password_strength(payload.password)),
    )
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return create_auth_session(entry, session)


@app.get("/api/user-entries", response_model=list[UserEntryResponse])
def list_user_entries(session: Session = Depends(get_session)) -> list[UserEntryResponse]:
    return session.exec(select(UserEntry).order_by(UserEntry.name.asc())).all()


@app.get("/api/user-topics", response_model=list[UserTopicResponse])
def list_user_topics(session: Session = Depends(get_session)) -> list[UserTopicResponse]:
    topics = session.exec(select(UserTopic).order_by(UserTopic.created_at.desc())).all()
    return [build_user_topic_response(topic, session) for topic in topics]


@app.get("/api/feedbacks", response_model=list[FeedbackResponse])
def list_feedbacks(session: Session = Depends(get_session)) -> list[FeedbackResponse]:
    feedback_items = session.exec(select(Feedback).order_by(Feedback.created_at.desc())).all()
    return [build_feedback_response(item) for item in feedback_items]


@app.post("/api/feedbacks", response_model=FeedbackResponse, status_code=201)
def create_feedback(
    payload: FeedbackCreate,
    current_user: UserEntry | None = Depends(get_optional_current_user),
    session: Session = Depends(get_session),
) -> FeedbackResponse:
    topic = session.get(UserTopic, payload.user_topic_id)
    if topic is None:
        raise HTTPException(status_code=404, detail="Selected topic was not found.")

    topic_owner = session.get(UserEntry, topic.user_entry_id)
    if topic_owner is None:
        raise HTTPException(status_code=404, detail="Selected topic owner was not found.")

    topic_points = parse_topics_text(topic.topics_text)
    topic_preview = topic_points[0] if topic_points else "Topic"
    topic_label = f"{topic_owner.name} - {topic_preview}"

    feedback = Feedback(
        user_topic_id=topic.id,
        topic_label=topic_label,
        feedback_text=payload.feedback_text.strip(),
    )

    if payload.use_logged_in_identity:
        if current_user is None:
            raise HTTPException(status_code=401, detail="Please login first to post as a logged-in user.")

        feedback.user_entry_id = current_user.id
        feedback.user_name = current_user.name
        feedback.user_email = current_user.email

    session.add(feedback)
    session.commit()
    session.refresh(feedback)
    return build_feedback_response(feedback)


@app.post("/api/user-topics", response_model=UserTopicResponse, status_code=201)
def create_user_topic(
    payload: UserTopicCreate,
    current_user: UserEntry = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> UserTopicResponse:
    topic = session.exec(
        select(UserTopic).where(UserTopic.user_entry_id == current_user.id)
    ).first()

    if topic is None:
        topic = UserTopic(
            user_entry_id=current_user.id,
            topics_text=payload.topics_text.strip(),
        )
    else:
        topic.topics_text = payload.topics_text.strip()

    session.add(topic)
    session.commit()
    session.refresh(topic)
    return build_user_topic_response(topic, session)


@app.put("/api/user-topics/{topic_id}", response_model=UserTopicResponse)
def update_user_topic(
    topic_id: int,
    payload: UserTopicUpdate,
    current_user: UserEntry = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> UserTopicResponse:
    topic = session.get(UserTopic, topic_id)
    if topic is None:
        raise HTTPException(status_code=404, detail="User topic not found")

    require_topic_owner_or_admin(topic, current_user)

    topic.topics_text = payload.topics_text.strip()
    session.add(topic)
    session.commit()
    session.refresh(topic)
    return build_user_topic_response(topic, session)


@app.delete("/api/user-topics/{topic_id}")
def delete_user_topic(
    topic_id: int,
    current_user: UserEntry = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> dict[str, str]:
    topic = session.get(UserTopic, topic_id)
    if topic is None:
        raise HTTPException(status_code=404, detail="User topic not found")

    require_topic_owner_or_admin(topic, current_user)

    session.delete(topic)
    session.commit()
    return {"status": "deleted"}


@app.get("/{full_path:path}", include_in_schema=False)
def serve_frontend(full_path: str):
    if not full_path or full_path.startswith(("api/", "docs", "redoc", "openapi.json", "uploads/")):
        raise HTTPException(status_code=404, detail="Not found")

    requested_path = FRONTEND_DIST_DIR / full_path
    if requested_path.is_file():
        return FileResponse(requested_path)

    index_file = FRONTEND_DIST_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)

    raise HTTPException(status_code=404, detail="Frontend build not found")