http://localhost:8000

http://localhost:8000/docs


Component	URL	Status
User Interface	http://localhost:8000	Live (Served by FastAPI)
Interactive API Docs	http://localhost:8000/docs	Live
Database	rsp_nepal.db	Connected

uvicorn app.main:app --reload