import sqlite3
from pathlib import Path
import logging
import os

logger = logging.getLogger(__name__)

# SQLite 데이터베이스 경로 설정
SQLITE_DIR = os.getenv('SQLITE_DIR', str(Path(__file__).parent.parent / "data"))
DB_PATH = Path(SQLITE_DIR) / "extractions.db"

def init_db():
    """데이터베이스 초기화 및 테이블 생성"""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    
    # 추출 데이터 테이블 생성
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS property_extractions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id TEXT UNIQUE NOT NULL,
        property_type TEXT,
        price INTEGER,
        address TEXT,
        business_type TEXT,
        building_name TEXT,
        floor INTEGER,
        dong TEXT,
        deposit INTEGER,
        monthly_rent INTEGER,
        premium INTEGER,
        owner_name TEXT,
        owner_contact TEXT,
        tenant_name TEXT,
        tenant_contact TEXT,
        property_address TEXT,
        memo TEXT,
        summary TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    conn.commit()
    conn.close()

def insert_extraction(job_id: str, extraction_data: dict):
    """추출 데이터를 SQLite에 저장"""
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
        INSERT INTO property_extractions (
            job_id, property_type, price, address, business_type,
            building_name, floor, dong, deposit, monthly_rent,
            premium, owner_name, owner_contact, tenant_name,
            tenant_contact, property_address, memo, summary
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            job_id,
            extraction_data.get('property_info', {}).get('property_type'),
            extraction_data.get('property_info', {}).get('price'),
            extraction_data.get('property_info', {}).get('address'),
            extraction_data.get('property_info', {}).get('business_type'),
            extraction_data.get('property_info', {}).get('building_name'),
            extraction_data.get('property_info', {}).get('floor'),
            extraction_data.get('property_info', {}).get('dong'),
            extraction_data.get('property_info', {}).get('deposit'),
            extraction_data.get('property_info', {}).get('monthly_rent'),
            extraction_data.get('property_info', {}).get('premium'),
            extraction_data.get('owner_info', {}).get('name'),
            extraction_data.get('owner_info', {}).get('contact'),
            extraction_data.get('tenant_info', {}).get('name'),
            extraction_data.get('tenant_info', {}).get('contact'),
            extraction_data.get('tenant_info', {}).get('property_address'),
            extraction_data.get('tenant_info', {}).get('memo'),
            extraction_data.get('summary')
        ))
        conn.commit()
    except Exception as e:
        logger.error(f"데이터 저장 중 오류 발생: {str(e)}")
        raise
    finally:
        conn.close()

def get_all_extractions():
    """모든 추출 데이터 조회"""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM property_extractions ORDER BY created_at DESC')
    rows = cursor.fetchall()
    
    conn.close()
    return [dict(row) for row in rows] 