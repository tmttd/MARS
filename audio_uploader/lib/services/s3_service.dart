import 'dart:io';
import 'dart:convert';  // base64Encode를 위한 import 추가
import 'package:aws_s3_api/s3-2006-03-01.dart';
import '../config/aws_config.dart';
import '../utils/app_logger.dart';

class S3Service {
  late final S3 _s3;

  S3Service() {
    _s3 = S3(
      region: AwsConfig.region,
      credentials: AwsClientCredentials(
        accessKey: AwsConfig.accessKeyId,
        secretKey: AwsConfig.secretAccessKey,
      ),
    );
  }

  Future<bool> uploadFile(String filePath) async {
    try {
      final file = File(filePath);
      final originalFileName = file.path.split('/').last;
      
      // 확장자 추출 및 유지
      final extension = originalFileName.split('.').last;  // 'm4a'
      final now = DateTime.now().toUtc().add(const Duration(hours: 9)); // UTC+9 (한국 시간)
      final formattedDate = '${now.year}${now.month.toString().padLeft(2, '0')}${now.day.toString().padLeft(2, '0')}_'
          '${now.hour.toString().padLeft(2, '0')}${now.minute.toString().padLeft(2, '0')}${now.second.toString().padLeft(2, '0')}_'
          '${now.millisecond.toString().padLeft(3, '0')}';
      final encodedFileName = 'file_$formattedDate.$extension';
      
      logger.d('원본 파일명: $originalFileName');
      logger.d('저장 파일명: $encodedFileName');
      
      final fileBytes = await file.readAsBytes();
      final response = await _s3.putObject(
        bucket: AwsConfig.bucketName,
        key: encodedFileName,
        body: fileBytes,
        metadata: {
          'originalFileName': base64Encode(utf8.encode(originalFileName)),  // Base64 인코딩
          'uploadTime': DateTime.now().toIso8601String(),
        }
      );
      
      return response.eTag != null;
    } catch (e) {
      logger.e('업로드 실패: $e');
      return false;
    }
  }
}