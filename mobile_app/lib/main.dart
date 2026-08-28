import 'package:flutter/material.dart';
import 'screens/chat_home_screen.dart';
import 'theme/app_theme.dart';

void main() {
  runApp(const WaseemMessagingApp());
}

class WaseemMessagingApp extends StatelessWidget {
  const WaseemMessagingApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Waseem Messaging',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      home: const ChatHomeScreen(),
    );
  }
}
