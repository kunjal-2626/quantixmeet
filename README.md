# QuantixMeet

QuantixMeet is a full-stack meeting scheduling platform that allows users to create accounts, manage availability, schedule meetings, and integrate calendars. It is built with a FastAPI backend, React frontend, and MongoDB database.

## Features

- User authentication
- JWT-based authorization
- Meeting scheduling
- Calendar integration
- MongoDB database
- RESTful APIs
- Responsive user interface
- Secure environment variable configuration

## Tech Stack

### Frontend
- React
- Vite
- Tailwind CSS
- JavaScript

### Backend
- FastAPI
- Python
- Motor (Async MongoDB Driver)
- PyMongo
- JWT Authentication

### Database
- MongoDB

## Project Structure

```
quantixmeet/
│
├── backend/
│   ├── routes/
│   ├── models/
│   ├── utils/
│   ├── database.py
│   └── main.py
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── .gitignore
├── README.md
└── requirements.txt
```

## Installation

### Clone the repository

```bash
git clone https://github.com/kunjal-2626/quantixmeet.git
cd quantixmeet
```

### Backend Setup

Create a virtual environment:

```bash
python3.11 -m venv venv
```

Activate it:

macOS/Linux

```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Start the backend:

```bash
cd backend
python -m uvicorn main:app --reload
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

Create a file named:

```
backend/.env
```

Example:

```env
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_secret_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
AZURE_CLIENT_SECRET=your_azure_client_secret
```

## API Documentation

Once the backend is running:

```
http://127.0.0.1:8000/docs
```

## Future Enhancements

- Google Calendar synchronization
- Outlook Calendar integration
- Email notifications
- Video meeting integration
- Admin dashboard
- Meeting reminders

## Author

**Kunjal Sri Hari Priya**

GitHub: https://github.com/kunjal-2626
