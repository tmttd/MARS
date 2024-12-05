import 'dart:io';

class AwsConfig {
  static const String region = 'ap-northeast-2';  // 서울 리전
  static const String bucketName = 'raumtest';
  static final String accessKeyId = Platform.environment['AWS_ACCESS_KEY_ID'] ?? '';
  static final String secretAccessKey = Platform.environment['AWS_SECRET_ACCESS_KEY'] ?? '';
}