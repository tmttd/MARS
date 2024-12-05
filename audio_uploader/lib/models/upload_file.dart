class UploadFile {
  final String path;
  final DateTime detectedTime;
  String status;

  UploadFile({
    required this.path,
    required this.detectedTime,
    this.status = '대기중',
  });

  String get fileName => path.split('/').last;
  
  String get formattedTime {
    // UTC를 한국 시간(UTC+9)으로 변환
    final koreaTime = detectedTime.toUtc().add(const Duration(hours: 9));
    
    return '${koreaTime.hour.toString().padLeft(2, '0')}:'
           '${koreaTime.minute.toString().padLeft(2, '0')}:'
           '${koreaTime.second.toString().padLeft(2, '0')}';
  }
}