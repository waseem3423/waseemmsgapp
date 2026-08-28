import 'package:flutter/material.dart';

class AppColors {
  static const Color background = Color(0xFF0B0F19);
  static const Color surface = Color(0xFF151C2C);
  static const Color surfaceLighter = Color(0xFF1E293B);
  static const Color primary = Color(0xFF00E5FF);
  static const Color primaryDark = Color(0xFF00B0FF);
  static const Color secondary = Color(0xFF6C5CE7);
  static const Color accent = Color(0xFFFF2A85);
  static const Color online = Color(0xFF00E676);
  
  static const Color textPrimary = Color(0xFFF8FAFC);
  static const Color textSecondary = Color(0xFF94A3B8);
  static const Color textMuted = Color(0xFF64748B);
  
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [Color(0xFF00E5FF), Color(0xFF6C5CE7)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient storyRingGradient = LinearGradient(
    colors: [Color(0xFF00E5FF), Color(0xFFFF2A85), Color(0xFF6C5CE7)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
  
  static const LinearGradient unreadBadgeGradient = LinearGradient(
    colors: [Color(0xFFFF2A85), Color(0xFFFF5252)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );
}

class AppTheme {
  static ThemeData get darkTheme {
    return ThemeData.dark().copyWith(
      scaffoldBackgroundColor: AppColors.background,
      colorScheme: const ColorScheme.dark(
        primary: AppColors.primary,
        secondary: AppColors.secondary,
        surface: AppColors.surface,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.background,
        elevation: 0,
        centerTitle: false,
        iconTheme: IconThemeData(color: AppColors.textPrimary),
      ),
      useMaterial3: true,
    );
  }
}
