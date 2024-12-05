import 'package:flutter/material.dart';
import '../models/upload_file.dart';
import '../utils/app_logger.dart';
import '../utils/app_state_manager.dart';

class QueueStatusPage extends StatefulWidget {
  const QueueStatusPage({super.key});

  @override
  QueueStatusPageState createState() => QueueStatusPageState();
}

class QueueStatusPageState extends State<QueueStatusPage> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('업로드 큐 상태'),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '대기 중인 파일 (${AppStateManager.uploadQueue.length})',
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Expanded(
              child: ListView.builder(
                itemCount: AppStateManager.uploadQueue.length,
                itemBuilder: (context, index) {
                  final file = AppStateManager.uploadQueue[index];
                  return Card(
                    child: ListTile(
                      leading: const Icon(Icons.file_present),
                      title: Text(file.fileName),
                      subtitle: Text('감지 시간: ${file.formattedTime}'),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            file.status,
                            style: TextStyle(
                              color: file.status == '실패' ? Colors.red : Colors.blue,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.delete, color: Colors.red),
                            onPressed: () {
                              logger.i('버튼 눌림!');
                              _removeFileFromQueue(index);
                            },
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _removeFileFromQueue(int index) {
    logger.i('함수 시작');
    
    if (AppStateManager.uploadQueue.isNotEmpty && 
        index < AppStateManager.uploadQueue.length) {
      logger.i('if문 진입: index=$index, 큐 크기=${AppStateManager.uploadQueue.length}');
      
      try {
        setState(() {
          logger.i('setState 시작');
          AppStateManager.uploadQueue.removeAt(index);
          logger.i('removeAt 완료');
        });
        
        logger.i('setState 완료');
        AppStateManager.saveState();
        logger.i('상태 저장 완료');
      } catch (e) {
        logger.e('오류 발생: $e');
      }
      
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('파일이 큐에서 삭제되었습니다.')),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('삭제할 파일이 없습니다.')),
      );
    }
  }
}