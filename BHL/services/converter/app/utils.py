from datetime import datetime, timezone

UTC = timezone.utc

def parse_string_to_datetime(date_str: str) -> datetime:
    """
    문자열 형식의 날짜를 datetime 객체로 변환합니다.
    예: "20240315143000" -> 2024-03-15 14:30:00
    
    Args:
        date_str (str): YYYYMMDDHHMMSS 형식의 날짜 문자열
        
    Returns:
        datetime: 변환된 datetime 객체
    """
    year = int(date_str[0:4])
    month = int(date_str[4:6])
    day = int(date_str[6:8])
    hour = int(date_str[8:10])
    minute = int(date_str[10:12])
    second = int(date_str[12:14])
    return datetime(year, month, day, hour, minute, second, tzinfo=UTC)