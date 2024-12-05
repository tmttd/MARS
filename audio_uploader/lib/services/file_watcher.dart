import 'dart:async';
import 'package:watcher/watcher.dart';
import '../utils/app_logger.dart';
import 'package:path/path.dart' as path;

class DirectoryWatcherService {
  DirectoryWatcher? _watcher;
  final StreamController<String> _fileController = StreamController<String>.broadcast();
  bool _isWatching = false;

  // 오디오 파일 확장자 목록
  final _audioExtensions = ['.mp3', '.wav', '.m4a', '.aac', '.wma', '.ogg'];

  Stream<String> get fileStream => _fileController.stream;
  bool get isWatching => _isWatching;

  Future<void> startWatching(String directoryPath) async {
    if (_isWatching) {
      await stopWatching();
    }

    try {
      _watcher = DirectoryWatcher(directoryPath);
      _isWatching = true;

      _watcher!.events.listen((WatchEvent event) {
        if (event.type == ChangeType.ADD) {
          final extension = path.extension(event.path).toLowerCase();
          if (_audioExtensions.contains(extension)) {
            _fileController.add(event.path);
            logger.i('오디오 파일 감지: ${event.path}');
          }
        }
      }, onError: (error) {
        logger.e('Watcher error: $error');
        _isWatching = false;
      });
    } catch (e) {
      _isWatching = false;
      rethrow;
    }
  }

  Future<void> stopWatching() async {
    _isWatching = false;
    await _watcher?.ready;
    _watcher = null;
  }

  void dispose() {
    _fileController.close();
    stopWatching();
  }
}