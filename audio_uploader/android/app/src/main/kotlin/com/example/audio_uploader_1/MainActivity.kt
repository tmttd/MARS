package com.example.audio_uploader  // 패키지명은 실제 앱의 패키지명으로 변경

import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import android.os.PowerManager
import android.content.Context

class MainActivity: FlutterActivity() {
    private val CHANNEL = "com.example.app/battery_optimization"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            if (call.method == "isIgnoringBatteryOptimizations") {
                val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
                val packageName = packageName
                val isIgnoringBatteryOptimizations = powerManager.isIgnoringBatteryOptimizations(packageName)
                result.success(isIgnoringBatteryOptimizations)
            } else {
                result.notImplemented()
            }
        }
    }
}