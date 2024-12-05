import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:android_intent_plus/android_intent.dart';
import 'dart:io' show Platform;
import 'package:package_info_plus/package_info_plus.dart';
import '../utils/app_state_manager.dart';
import 'package:flutter/services.dart';
import '../utils/app_logger.dart';

class PermissionsPage extends StatefulWidget {
  const PermissionsPage({super.key});

  @override
  State<PermissionsPage> createState() => _PermissionsPageState();
}

class _PermissionsPageState extends State<PermissionsPage> with WidgetsBindingObserver {
  final Map<Permission, String> _permissions = {
    Permission.audio: '오디오 파일 접근 권한',
    Permission.notification: '알림 권한',
  };

  Map<Permission, bool> _permissionStatus = {};
  bool _isBatteryOptimizationDisabled = false;  // 배터리 최적화 상태 추가

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);  // 앱 생명주기 옵저버 추가
    _checkPermissions();
    _checkBatteryOptimizationStatus();  // 초기 상태 확인
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);  // 옵저버 제거
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      // 앱간의 딜레이 후 권한 체크 (권한 변경이 완전히 적용되도록)
      Future.delayed(const Duration(milliseconds: 500), () {
        if (mounted) {
          _checkPermissions();
        }
      });
    }
  }

  Future<void> _checkPermissions() async {
    if (!mounted) return;  // 안전 체크

    try {
      final Map<Permission, bool> statusMap = {};
      
      for (var permission in _permissions.keys) {
        if (!mounted) return;  // 루프 내에서도 안전 체크
        final isGranted = await permission.isGranted;
        statusMap[permission] = isGranted;
      }

      if (mounted) {
        setState(() {
          _permissionStatus = statusMap;
        });
      }
    } catch (e) {
      // 오류 발생 시 상태 초기화
      if (mounted) {
        setState(() {
          _permissionStatus = Map.fromIterables(
            _permissions.keys, 
            List.generate(_permissions.length, (_) => false)
          );
        });
      }
    }
  }

  Future<void> _togglePermission(Permission permission, bool newValue) async {
    if (!mounted) return;
    
    final BuildContext currentContext = context;
    
    try {
      if (!newValue) {
        final bool? confirm = await showDialog<bool>(
          context: currentContext,
          builder: (context) => AlertDialog(
            title: const Text('권한 비활성화'),
            content: Text('${_permissions[permission]} 을(를) 비활성화하려면\n설정에서 직접 변경해야 합니다.'),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: const Text('취소'),
              ),
              TextButton(
                onPressed: () => Navigator.pop(context, true),
                child: const Text('설정으로 이동'),
              ),
            ],
          ),
        );
        
        if (confirm == true) {
          await openAppSettings();  // 시스템 설정으로 이동
        }
        
        // 설정에서 돌아왔을 때 권한 상태 다시 확인
        if (mounted) {
          _checkPermissions();
        }
      } else {
        final status = await permission.request();
        
        if (!mounted) return;
        setState(() {
          _permissionStatus[permission] = status.isGranted;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _permissionStatus[permission] = false;
        });
      }
    }
  }

  // 배터리 최적화 상태 확인
  Future<bool> _checkBatteryOptimizationStatus() async {
    if (Platform.isAndroid) {
      try {
        const methodChannel = MethodChannel('com.example.app/battery_optimization');
        final bool isIgnoringBatteryOptimizations = 
            await methodChannel.invokeMethod('isIgnoringBatteryOptimizations');
        
        logger.i('배터리 최적화 상태 확인: $isIgnoringBatteryOptimizations');
        _isBatteryOptimizationDisabled = isIgnoringBatteryOptimizations;
        return isIgnoringBatteryOptimizations;
      } catch (e) {
        logger.e('배터리 최적화 상태 확인 실패: $e');
        return false;
      }
    }
    return false;
  }

  // 배터리 최적화 토글
  Future<void> _toggleBatteryOptimization(bool newValue) async {
    if (Platform.isAndroid) {
      try {
        if (!newValue) {
          // 비활성화하려고 할 때 설정창으로 이동
          final bool? confirm = await showDialog<bool>(
            context: context,
            builder: (context) => AlertDialog(
              title: const Text('배터리 최적화 비활성화'),
              content: const Text('배터리 최적화를 비활성화하려면\n설정에서 직접 변경해야 합니다.'),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context, false),
                  child: const Text('취소'),
                ),
                TextButton(
                  onPressed: () => Navigator.pop(context, true),
                  child: const Text('설정으로 이동'),
                ),
              ],
            ),
          );
          
          if (confirm == true) {
            await openAppSettings();  // 시스템 설정으로 이동
          }
        } else {
          // 활성화하려고 할 때
          final package = await PackageInfo.fromPlatform();
          final intent = AndroidIntent(
            action: 'android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
            data: 'package:${package.packageName}',
          );
          await intent.launch();
        }
        
        // 설정 변경 후 실제 상태 확인
        final actualStatus = await _checkBatteryOptimizationStatus();
        if (mounted) {
          setState(() {
            _isBatteryOptimizationDisabled = actualStatus;
          });
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('배터리 최적화 설정을 열 수 없습니다.')),
          );
        }
      }
    }
  }

  Future<void> _showResetConfirmDialog(BuildContext context) async {
    final bool? confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('앱 데이터 초기화'),
        content: const Text('모든 설정과 큐 데이터가 초기화됩니다.\n계속하시겠습니까?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('취소'),
          ),
          TextButton(
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('초기화'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      await _resetAppData();
    }
  }

  Future<void> _resetAppData() async {
    await AppStateManager.resetAppState();
    
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('앱 데이터가 초기화되었습니다')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('권한 설정'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              children: [
                // SharedPreferences 초기화 버튼 추가
                ListTile(
                  title: const Text(
                    '앱 데이터 초기화',
                    style: TextStyle(color: Colors.red),
                  ),
                  subtitle: const Text('모든 설정과 큐 데이터가 초기화됩니다'),
                  trailing: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.red,
                      foregroundColor: Colors.white,
                    ),
                    onPressed: () => _showResetConfirmDialog(context),
                    child: const Text('초기화'),
                  ),
                ),
                const Divider(thickness: 1),
                // 배터리 최적화 제외 설정
                ListTile(
                  title: const Text('배터리 최적화 제외'),
                  subtitle: Text(
                    _isBatteryOptimizationDisabled ? '활성화됨' : '비활성화됨',
                    style: TextStyle(
                      color: _isBatteryOptimizationDisabled ? Colors.green : Colors.red,
                    ),
                  ),
                  trailing: Switch(
                    value: _isBatteryOptimizationDisabled,
                    onChanged: _toggleBatteryOptimization,
                  ),
                ),
                // 기존 권한들
                ...List.generate(
                  _permissions.length,
                  (index) {
                    final permission = _permissions.keys.elementAt(index);
                    final permissionName = _permissions[permission];
                    final isGranted = _permissionStatus[permission] ?? false;

                    return ListTile(
                      title: Text(permissionName!),
                      subtitle: Text(
                        isGranted ? '활성화됨' : '비활성화됨',
                        style: TextStyle(
                          color: isGranted ? Colors.green : Colors.red,
                        ),
                      ),
                      trailing: Switch(
                        value: isGranted,
                        onChanged: (bool value) => _togglePermission(permission, value),
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

