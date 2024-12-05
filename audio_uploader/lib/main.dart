import 'package:flutter/material.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:file_picker/file_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'models/upload_file.dart';
import 'pages/permissions_page.dart';
import 'services/file_watcher.dart';
import 'services/s3_service.dart';
import '/services/foreground_service.dart';
import 'utils/app_logger.dart';
import 'dart:convert';
import 'dart:io';
import 'pages/queue_status_page.dart';
import 'utils/app_state_manager.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // 알림 권한 요청
  if (Platform.isAndroid) {
    await Permission.notification.request();
  }
  
  // Foreground 서비스 시작
  await ForegroundService.startService();
  
  runApp(const MyApp(key: ValueKey('main')));
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  // This widget is the root of your application.
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AudioUploader Demo',
      theme: ThemeData(
        // This is the theme of your application.
        //
        // TRY THIS: Try running your application with "flutter run". You'll see
        // the application has a purple toolbar. Then, without quitting the app,
        // try changing the seedColor in the colorScheme below to Colors.green
        // and then invoke "hot reload" (save your changes or press the "hot
        // reload" button in a Flutter-supported IDE, or press "r" if you used
        // the command line to start the app).
        //
        // Notice that the counter didn't reset back to zero; the application
        // state is not lost during the reload. To reset the state, use hot
        // restart instead.
        //
        // This works for code too, not just values: Most code changes can be
        // tested with just a hot reload.
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.greenAccent),
        useMaterial3: true,
      ),
      home: const MyHomePage(title: 'Audio Uploader by BlueTorch'),
    );
  }
}

class MyHomePage extends StatefulWidget {
  const MyHomePage({super.key, required this.title});

  // This widget is the home page of your application. It is stateful, meaning
  // that it has a State object (defined below) that contains fields that affect
  // how it looks.

  // This class is the configuration for the state. It holds the values (in this
  // case the title) provided by the parent (in this case the App widget) and
  // used by the build method of the State. Fields in a Widget subclass are
  // always marked "final".

  final String title;

  @override
  State<MyHomePage> createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  final DirectoryWatcherService _watcherService = DirectoryWatcherService();
  final S3Service _s3Service = S3Service();
  bool isOn = false;
  String? selectedDirectory;
  bool _isUploading = false;  // 업로드 상태를 추적

  final List<Permission> _requiredPermissions = [
    Permission.audio,
    Permission.notification,
  ];

  // 1. 컨트롤러 리스트 선언
  List<List<TextEditingController>> controllers = List.generate(
    7,  // 첫 번째 매개변수: 7개의 행 생성
    (i) => List.generate(
      3,  // 두 번째 매개변수: 각 행마다 3개의 열 생성
      (j) => TextEditingController(),  // 각 셀마다 새로운 컨트롤러 생성
    ),
  );

  @override
  void dispose() {
    _watcherService.dispose();
    // 모든 행을 순회
    for (var row in controllers) {
      // 각 행의 모든 컨트롤러를 순회
      for (var controller in row) {
        controller.dispose();  // 각 컨트롤러 해제
      }
    }
    super.dispose();  // 부모 클래스의 dispose 호출
  }

  Future<void> requestPermissions() async {
    final BuildContext currentContext = context;
    
    if (await Permission.storage.request().isGranted) {
      if (currentContext.mounted) {
        ScaffoldMessenger.of(currentContext).showSnackBar(
          const SnackBar(
            content: Text('저장소 접근 권한이 승인되었습니다.'),
            duration: Duration(seconds: 2),
          ),
        );
      }
    } else {
      if (currentContext.mounted) {
        showDialog(
          context: currentContext,
          builder: (context) => AlertDialog(
            title: const Text('권한 필요'),
            content: const Text('파일 접근을 위해 저장소 권한이 필요합니다.'),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('확인'),
              ),
            ],
          ),
        );
      }
    }
  }
  Future<void> selectDirectory() async {
    
    try {
      String? result = await FilePicker.platform.getDirectoryPath();
      
      if (result != null) {
        logger.i('선택된 디렉토리: $result');
        setState(() {
          selectedDirectory = result;
        });
        
        // 선택된 경로 저장
        await SharedPreferences.getInstance().then((prefs) {
          prefs.setString('selectedDirectory', result);
        });
      }
    } catch (e) {
      logger.e('디렉토리 선택 오류: $e');
    }
  }

  @override
  void initState() {
    super.initState();
    _initializeApp();
  }

  Future<void> _initializeApp() async {
    // 1. 권한 체크 및 요청
    await _checkAndRequestPermissions();
    
    // 2. 저장된 디렉토리 로드
    await _loadSavedDirectory();
    
    // 3. 저장된 상태 불러오기
    final prefs = await SharedPreferences.getInstance();
    if (mounted) {
      setState(() {
        isOn = prefs.getBool('isAutomationOn') ?? false;
        
        // 완료된 파일 목록 불러오기
        final completedFilesString = prefs.getString('completedFiles');
        if (completedFilesString != null) {
          final completedFilesData = jsonDecode(completedFilesString) as List;
          AppStateManager.completedFiles.clear();
          AppStateManager.completedFiles.addAll(
            completedFilesData.map((data) => UploadFile(
              path: data['path'],
              detectedTime: DateTime.parse(data['detectedTime']),
              status: data['status'],
            )).toList(),    
          );
        }
        final queueString = prefs.getString('uploadQueue');
        if (queueString != null) {
          final uploadFilesData = jsonDecode(queueString) as List;
          AppStateManager.uploadQueue.clear();
          AppStateManager.uploadQueue.addAll(
            uploadFilesData.map((data) => UploadFile(
              path: data['path'],
              detectedTime: DateTime.parse(data['detectedTime']),
              status: data['status'],
            )).toList(),
          );
        }
        _updateTableControllers();
      });
    }
    
    // 4. 파일 감지 초기화
    _initializeWatcher();
    
    // 5. 자동화가 켜져있었다면 감시 시작
    if (isOn && selectedDirectory != null) {
      await _startWatching(selectedDirectory!);
    }
  }

  Future<void> _loadSavedDirectory() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      selectedDirectory = prefs.getString('selectedDirectory');
    });
  }

  void _initializeWatcher() {
    _watcherService.fileStream.listen((filePath) {
      // 새 파일이 감지되면 처리
      _handleNewFile(filePath);
    });
  }

  void _handleNewFile(String filePath) async {
    logger.i('=== _handleNewFile 시작 ===');
    logger.i('파일 경로: $filePath');
    logger.i('현재 큐 크기: ${AppStateManager.uploadQueue.length}');

    // 이미 큐에 있는 파일인지 확인
    if (AppStateManager.uploadQueue.any((file) => file.path == filePath)) {
      logger.i('중복 파일 감지 - 처리 중단');
      return;
    }

    try {
      final newFile = UploadFile(
        path: filePath,
        detectedTime: DateTime.now(),
        status: '업로드 중...',
      );
      
      // 큐에 추가하고 상태 저장
      AppStateManager.addToQueue(newFile);
      await _updateTableControllers();
      logger.i('테이블 컨트롤러 업데이트 완료');

      // S3 업로드 시도
      logger.i('S3 업로드 시작');
      final success = await _s3Service.uploadFile(filePath);
      logger.i('S3 업로드 결과: ${success ? "성공" : "실패"}');
      
      if (success) {
        // uploadQueue에서 해당 파일을 찾아서 상태를 변경
        final fileInQueue = AppStateManager.uploadQueue.firstWhere(
            (f) => f.path == newFile.path
        );
        fileInQueue.status = '완료';
        AppStateManager.moveToCompleted(fileInQueue);  // 큐에서 찾은 파일을 이동
      } else {
        newFile.status = '실패';
      }
      
      // 상태 변경 후 테이블 업데이트
      await AppStateManager.saveState();  // SharedPreferences 저장
      await _updateTableControllers();    // 테이블 업데이트
      
    } catch (e) {
      logger.e('_handleNewFile 처리 중 오류: $e');
    }
    
    logger.i('=== _handleNewFile 종료 ===');
  }

  Future<void> _updateTableControllers() async {
    final prefs = await SharedPreferences.getInstance();
    List<UploadFile> allFiles = [];
    
    // SharedPreferences에서 데이터 불러오기
    final queueString = prefs.getString('uploadQueue');
    final completedString = prefs.getString('completedFiles');
    
    // 업로드 큐 데이터 처리
    if (queueString != null) {
      final queueData = jsonDecode(queueString) as List;
      allFiles.addAll(queueData.map((data) => UploadFile(
        path: data['path'],
        detectedTime: DateTime.parse(data['detectedTime']),
        status: data['status'],
      )));
    }
    
    // 완료된 파일 데이터 처리
    if (completedString != null) {
      final completedData = jsonDecode(completedString) as List;
      allFiles.addAll(completedData.map((data) => UploadFile(
        path: data['path'],
        detectedTime: DateTime.parse(data['detectedTime']),
        status: data['status'],
      )));
    }
    
    // 날짜순 정렬
    allFiles.sort((a, b) => b.detectedTime.compareTo(a.detectedTime));
    
    // AppStateManager 상태 먼저 업데이트
    AppStateManager.uploadQueue.clear();
    AppStateManager.completedFiles.clear();
    
    // 큐와 완료된 파일 분리하여 저장
    for (var file in allFiles) {
      if (file.status == '완료') {
        AppStateManager.completedFiles.add(file);
      } else {
        AppStateManager.uploadQueue.add(file);
      }
    }

    // 최대 7개까지만 표시
    final displayFiles = allFiles.take(7).toList();
    
    // UI 업데이트는 setState 내에서 수행
    setState(() {
      // 컨트롤러 초기화
      for (var i = 0; i < 7; i++) {
        if (i < displayFiles.length) {
          final file = displayFiles[i];
          controllers[i][0].text = file.formattedTime;
          controllers[i][1].text = file.fileName;
          controllers[i][2].text = file.status;
        } else {
          // 빈 행 처리
          controllers[i][0].text = '';
          controllers[i][1].text = '';
          controllers[i][2].text = '';
        }
      }
    });
  }

  Future<void> _checkAndRequestPermissions() async {
    final BuildContext currentContext = context;
    
    for (var permission in _requiredPermissions) {
      if (!await permission.isGranted) {
        if (currentContext.mounted) {
          final snackBar = SnackBar(
            content: Text('${permission.toString()} 권한이 필요합니다. 설정에서 권한을 허용해주세요.'),
            duration: const Duration(seconds: 2),
          );
          ScaffoldMessenger.of(currentContext).showSnackBar(snackBar);
          
          // mounted 체크 후 네비게이션
          await Navigator.push(
            currentContext,
            MaterialPageRoute(
              builder: (context) => const PermissionsPage(),
            ),
          );
        }
        break;
      }
    }
  }

  Future<void> _startWatching(String path) async {
    final BuildContext currentContext = context;
    try {
      await _watcherService.startWatching(path);
      if (currentContext.mounted) {
        ScaffoldMessenger.of(currentContext).showSnackBar(
          const SnackBar(content: Text('디렉토리 동기화가 완료되었습니다.')),
        );
      }
    } catch (e) {
      if (currentContext.mounted) {
        showDialog(
          context: currentContext,
          builder: (context) => AlertDialog(
            title: const Text('오류'),
            content: Text('디렉토리 동기화 중 오류가 발생했습니다: $e'),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('확인'),
              ),
            ],
          ),
        );
      }
    }
  }

  Future<void> _uploadAllFiles() async {
    logger.i('업로드 시작');
    
    // 실패했거나 미완료된 파일만 필터링
    final filesToUpload = AppStateManager.uploadQueue.where((file) => 
      file.status == '실패' || file.status == '업로드 중...' || file.status == '대기중').toList();
      
    if (filesToUpload.isEmpty) {
      logger.w('업로드할 파일이 없습니다.');
      return;
    }

    setState(() {
      _isUploading = true;
    });

    for (var file in filesToUpload) {
      if (!_isUploading) {
        logger.i('업로드 중지됨');
        break;
      }

      logger.i('파일 업로드 시도: ${file.path}');
      setState(() {
        file.status = '업로드 중...';
        _updateTableControllers();
      });

      try {
        final success = await _s3Service.uploadFile(file.path);
        logger.i(success ? '업로드 성공' : '업로드 실패: AWS 응답 없음');
        
        setState(() {
          if (success) {
            file.status = '완료';
            AppStateManager.moveToCompleted(file);
          } else {
            file.status = '실패';
          }
          _updateTableControllers();
        });
      } catch (e, stackTrace) {
        logger.e('업로드 중 오류 발생: $e\n$stackTrace');
        setState(() {
          file.status = '오류';
          _updateTableControllers();
        });
      }
    }

    setState(() {
      _isUploading = false;
    });
    logger.i('모든 업로드 완료');
  }

  void _stopUploading() {
    setState(() {
      _isUploading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
      ),
      body: Column(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,  // 세로 방향 균등 배치
        children: [
          // 상단 컨트롤 영역
          Expanded(
            flex: 3,  // flex를 2에서 3으로 증가
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      Row(
                        children: [
                          const Text(
                            '자동화 기능',
                            style: TextStyle(fontSize: 18),
                          ),
                          const SizedBox(width: 8),
                          Switch(
                            value: isOn,
                            onChanged: (value) async{
                              setState(() => isOn = value);

                              // SharedPreferences에 상태 저장
                              final prefs = await SharedPreferences.getInstance();
                              await prefs.setBool('isAutomationOn', value);

                              if (value && selectedDirectory != null) {
                                _startWatching(selectedDirectory!);
                              } else if (!value) {
                                _watcherService.stopWatching();
                              }
                            },
                          ),
                        ],
                      ),
                    ],
                  ),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      ElevatedButton(
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => const PermissionsPage(),
                            ),
                          );
                        },
                        child: const Text(
                          '권한 설정',
                          style: TextStyle(fontSize: 18),
                        ),
                      ),
                      ElevatedButton(
                        onPressed: selectDirectory,
                        child: const Text(
                          '디렉토리 설정',
                          style: TextStyle(fontSize: 18),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),

          // WiFi 상태 위젯 아래에 추가
          Expanded(
            flex: 1,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text(
                    '지정된 디렉토리: ',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  Expanded(
                    child: Text(
                      selectedDirectory ?? '선택된 디렉토리 없음',
                      style: const TextStyle(fontSize: 16),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),
          ),

          const Divider(
            thickness: 2,
            indent: 8,
            endIndent: 8,
            color: Colors.grey,
          ),

          // WiFi 상태
          const Expanded(  // 2번째 섹션
            flex: 1,
            child: Padding(
              padding: EdgeInsets.symmetric(horizontal: 16.0),
              child: WifiStatusWidget(),
            ),
          ),

          // 업로드 버튼들
          Expanded(  // 3번째 섹션
            flex: 4,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.only(right: 8.0),
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Theme.of(context).colorScheme.tertiary,     // 메인 테마 색상
                          foregroundColor: Theme.of(context).colorScheme.surface,  // 텍스트 색상
                          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12), // 패딩
                          minimumSize: const Size(120, 45), // 최소 크기 설정
                          maximumSize: const Size(200, 80), // 최대 크기 설정
                          fixedSize: const Size(150, 75), // 고정 크기 설정
                          shape: RoundedRectangleBorder( // 모서리 둥글게
                            borderRadius: BorderRadius.circular(8),
                          ),
                          elevation: 3, // 그림자 효과
                          textStyle: TextStyle(
                            fontSize: MediaQuery.of(context).size.width * 0.04,  // 화면 너비에 비례
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        onPressed: _isUploading ? null : _uploadAllFiles, 
                        child: const Text('업로드 실행'),
                      ),
                    ),
                  ),
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.only(left: 8.0),
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.blueGrey, // 배경색
                          foregroundColor: Colors.white, // 텍스트 색상
                          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12), // 패딩
                          minimumSize: const Size(120, 45), // 최소 크기 설정
                          maximumSize: const Size(200, 80), // 최대 크기 설정
                          fixedSize: const Size(150, 75), // 고정 크기 설정
                          shape: RoundedRectangleBorder( // 모서리 둥글게
                            borderRadius: BorderRadius.circular(8),
                          ),
                          elevation: 3, // 그림자 효과
                          textStyle: TextStyle(
                            fontSize: MediaQuery.of(context).size.width * 0.04,  // 화면 너비에 비례
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        onPressed: _isUploading ? _stopUploading : null, // 업로드 중지 
                        child: const Text('업로드 중지'),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          const Divider(
            thickness: 2,
            indent: 8,
            endIndent: 8,
            color: Colors.grey,
          ),

          // 업로드 상태 텍스트와 큐 확인 버튼
          Expanded(  // 4번째 섹션
            flex: 2,
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 8.0),
              child: Center(
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text(
                      '업로드 상태',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(width: 16), // 텍스트와 버튼 사이의 간격
                    ElevatedButton(
                      onPressed: _showQueueStatus, // 큐 상태를 보여주는 함수 호출
                      child: const Text('큐 확인'),
                    ),
                  ],
                ),
              ),
            ),
          ),

          // 테이블
          Expanded(  // 5번째 섹션
            flex: 10,  // 테이블에 더 많은 공간 할당
            child: Container(
              margin: const EdgeInsets.all(16.0),
              child: Table(
                border: TableBorder.all(
                  color: Colors.grey.shade300,
                  width: 1.0,
                ),
                columnWidths: const {
                  0: FlexColumnWidth(1.2),
                  1: FlexColumnWidth(2.0),
                  2: FlexColumnWidth(1.0),
                },
                children: [
                  // 헤더 행
                  TableRow(
                    decoration: BoxDecoration(
                      color: Colors.grey.shade100,
                    ),
                    children: [
                      '업로드 시간',
                      '파일명', 
                      '상태',
                    ].map((text) => Container(
                      height: 45,
                      padding: const EdgeInsets.all(8.0),
                      alignment: Alignment.center,
                      child: Text(
                        text,
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 15,
                        ),
                      ),
                    )).toList(),
                  ),
                  // 데이터 행들
                  ...List.generate(7, (row) {
                    return _buildTableRow(row);
                  }),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  TableRow _buildTableRow(int index) {
    return TableRow(
      decoration: BoxDecoration(
        color: index % 2 == 0 ? Colors.white : Colors.grey.shade50,
      ),
      children: List.generate(3, (col) {
        return Container(
          height: 40,
          padding: const EdgeInsets.symmetric(horizontal: 8.0),
          child: TextField(
            controller: controllers[index][col],
            textAlign: TextAlign.center,
            decoration: const InputDecoration(
              border: InputBorder.none,
              hintText: '',
            ),
            readOnly: true,
          ),
        );
      }),
    );
  }

  // 큐 상태 페이지로 넘어가는 함수
  void _showQueueStatus() async {
    // Navigator.push의 결과를 기다림
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => const QueueStatusPage(),
      ),
    );
    
    // 페이지에서 돌아왔을 때 테이블 업데이트
    if (mounted) {
      await _updateTableControllers();
      logger.i('테이블 업데이트 완료');
    }
  }
}

class WifiStatusWidget extends StatefulWidget {
  const WifiStatusWidget({super.key});

  @override
  State<WifiStatusWidget> createState() => _WifiStatusWidgetState();
}

class _WifiStatusWidgetState extends State<WifiStatusWidget> {
  bool? isWifiConnected;
  late Stream<ConnectivityResult> subscription;

  @override
  void initState() {
    super.initState();
    checkWifiStatus();
    // 상태 변화 감지
    subscription = Connectivity().onConnectivityChanged;
    subscription.listen((ConnectivityResult result) {
      setState(() {
        isWifiConnected = result == ConnectivityResult.wifi;
      });
    });
  }

  @override
  void dispose() {
    // Stream은 자동으로 dispose됩니다
    super.dispose();
  }

  Future<void> checkWifiStatus() async {
    var connectivityResult = await Connectivity().checkConnectivity();
    setState(() {
      isWifiConnected = connectivityResult == ConnectivityResult.wifi;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Text(
            'Wi-Fi 연결 여부: ',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          Text(
            isWifiConnected == null
                ? '확인 중...'
                : isWifiConnected!
                    ? 'OK'
                    : 'NO',
            style: TextStyle(
              fontSize: 18,
              color: isWifiConnected == null
                  ? Colors.grey
                  : isWifiConnected!
                      ? Colors.green
                      : Colors.red,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }
}