import 'dart:async';  // 이 줄을 파일 상단에 추가
import 'package:flutter_foreground_task/flutter_foreground_task.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'file_watcher.dart';  // DirectoryWatcherService가 정의된 파일
import 's3_service.dart';
import '../models/upload_file.dart';   // S3Service가 정의된 파일
import '../utils/app_state_manager.dart';
import '../utils/app_logger.dart';

class ForegroundService {
  static bool _isRunning = false;

  static Future<void> startService() async {
    if (_isRunning) return;

    // 배터리 최적화 제외 요청
    await FlutterForegroundTask.requestIgnoreBatteryOptimization();

    // 포그라운드 작업 설정
    FlutterForegroundTask.init(
      androidNotificationOptions: AndroidNotificationOptions(
        channelId: 'foreground_service',
        channelName: 'Audio Uploader Service',
        channelDescription: '오디오 파일 업로드 서비스입니다.',
        channelImportance: NotificationChannelImportance.LOW,
        priority: NotificationPriority.LOW, // drawable 폴더에 있는 아이콘 이름
      ),
      iosNotificationOptions: const IOSNotificationOptions(
        showNotification: true,
        playSound: false,
      ),
      foregroundTaskOptions: ForegroundTaskOptions(
        eventAction: ForegroundTaskEventAction.repeat(5000),
        autoRunOnBoot: true,  // 부팅 시 자동 실행
        allowWifiLock: true,  // WiFi 잠금 허용
      ),
    );

    // 포그라운드 작업 시작
    await FlutterForegroundTask.startService(
      notificationTitle: 'audio_uploader_1',
      notificationText: '파일 감지 중...',
      callback: startCallback,  // 백그라운드에서 실행될 콜백
    );

    _isRunning = true;
  }

  static Future<void> stopService() async {
    if (!_isRunning) return;
    await FlutterForegroundTask.stopService();
    _isRunning = false;
  }

  static bool get isRunning => _isRunning;
}

// 백그라운드에서 실행될 콜백
@pragma('vm:entry-point')
void startCallback() {
  FlutterForegroundTask.setTaskHandler(Handler());
}

// 작업 핸들러
class Handler extends TaskHandler {
  final DirectoryWatcherService _watcherService = DirectoryWatcherService();
  final S3Service _s3Service = S3Service();
  StreamSubscription<String>? _subscription;

  @override
  Future<void> onStart(DateTime timestamp, TaskStarter starter) async {
    final prefs = await SharedPreferences.getInstance();
    final selectedDirectory = prefs.getString('selectedDirectory');
    
    if (selectedDirectory != null) {
      await _watcherService.startWatching(selectedDirectory);
      
      // StreamSubscription을 클래스 변수로 저장
      _subscription = _watcherService.fileStream.listen(
        (filePath) async {
          try {
            final file = UploadFile(
              path: filePath,
              detectedTime: DateTime.now(),
              status: '대기중'
            );
            
            // AppStateManager를 통해 큐 관리
            AppStateManager.addToQueue(file);
            
            final success = await _s3Service.uploadFile(filePath);
            
            if (success) {
              file.status = '완료';
              AppStateManager.moveToCompleted(file);
            } else {
              file.status = '실패';
              // 상태 변경 후 저장
              AppStateManager.saveState();
            }
          } catch (e) {
            logger.e('파일 처리 중 오류 발생: $e');
            // 새로운 UploadFile 객체 생성
            final errorFile = UploadFile(
              path: filePath,
              detectedTime: DateTime.now(),
              status: '오류'
            );
            AppStateManager.addToQueue(errorFile);
            AppStateManager.saveState();
          }
        },
        onError: (error) {
          logger.e('스트림 에러 발생: $error');
        }
      );
    }
  }

  @override
  void onRepeatEvent(DateTime timestamp) {
    // 파일 감시 이벤트는 DirectoryWatcherService에서 자동으로 처리됨
  }

  @override
  Future<void> onDestroy(DateTime timestamp) async {
    await _subscription?.cancel();
    _watcherService.dispose();
    await FlutterForegroundTask.clearAllData();
  }
}