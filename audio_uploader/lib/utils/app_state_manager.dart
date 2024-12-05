import 'package:shared_preferences/shared_preferences.dart';
import 'app_logger.dart';
import '../models/upload_file.dart';
import 'dart:async';
import 'dart:convert';

class AppStateManager {
  // 싱글톤 인스턴스
  static final AppStateManager _instance = AppStateManager._internal();
  factory AppStateManager() => _instance;
  AppStateManager._internal();

  // 상태 관리를 위한 변수들
  static final List<UploadFile> _uploadQueue = [];
  static final List<UploadFile> _completedFiles = [];
  
  // Getters
  static List<UploadFile> get uploadQueue => _uploadQueue;
  static List<UploadFile> get completedFiles => _completedFiles;

  // 큐 관리 메서드들
  static void addToQueue(UploadFile file) {
    if (_uploadQueue.length >= 7) {
      _uploadQueue.removeAt(0);
    }
    _uploadQueue.add(file);
    saveState();
  }

  static void moveToCompleted(UploadFile file) {
    _uploadQueue.remove(file);
    _completedFiles.insert(0, file);
    if (_completedFiles.length > 7) {
      _completedFiles.removeRange(7, _completedFiles.length);
    }
    saveState();
  }

  static Future<void> saveState() async {
    final prefs = await SharedPreferences.getInstance();
    
    final queueData = _uploadQueue.map((file) => {
      'path': file.path,
      'detectedTime': file.detectedTime.toIso8601String(),
      'status': file.status,
    }).toList();
    
    final completedData = _completedFiles.map((file) => {
      'path': file.path,
      'detectedTime': file.detectedTime.toIso8601String(),
      'status': file.status,
    }).toList();

    await prefs.setString('uploadQueue', jsonEncode(queueData));
    await prefs.setString('completedFiles', jsonEncode(completedData));
  }

  // 기존의 resetAppState 메서드는 유지
  static Future<void> resetAppState() async {
    final prefs = await SharedPreferences.getInstance();
    
    // 초기화 전 상태 로깅
    logger.i('초기화 전 상태:'
      '\n- SharedPreferences:'
      '\n  * isAutomationOn: ${prefs.getBool('isAutomationOn')}'
      '\n  * uploadQueue: ${prefs.getString('uploadQueue')}'
      '\n  * completedFiles: ${prefs.getString('completedFiles')}'
      '\n- 메모리:'
      '\n  * uploadQueue (${_uploadQueue.length}개): $_uploadQueue'
      '\n  * completedFiles (${_completedFiles.length}개): $_completedFiles'
    );
    
    await prefs.clear();  // SharedPreferences 초기화
    
    // 메모리상의 큐 초기화
    _uploadQueue.clear();
    _completedFiles.clear();
    
    // 초기화 후 상태 로깅
    logger.i('초기화 후 상태:'
      '\n- SharedPreferences:'
      '\n  * isAutomationOn: ${prefs.getBool('isAutomationOn')}'
      '\n  * uploadQueue: ${prefs.getString('uploadQueue')}'
      '\n  * completedFiles: ${prefs.getString('completedFiles')}'
      '\n- 메모리:'
      '\n  * uploadQueue (${_uploadQueue.length}개): $_uploadQueue'
      '\n  * completedFiles (${_completedFiles.length}개): $_completedFiles'
    );
    
    logger.i('앱 상태 초기화 완료');
  }
}