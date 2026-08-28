import 'package:flutter/material.dart';
import '../models/chat_model.dart';
import '../theme/app_theme.dart';
import '../widgets/active_users_bar.dart';
import '../widgets/chat_tile.dart';
import '../widgets/search_and_filter.dart';

class ChatHomeScreen extends StatefulWidget {
  const ChatHomeScreen({Key? key}) : super(key: key);

  @override
  State<ChatHomeScreen> createState() => _ChatHomeScreenState();
}

class _ChatHomeScreenState extends State<ChatHomeScreen> {
  int _currentNavIndex = 0;
  String _searchQuery = '';
  String _activeFilter = 'All';

  // Sample data for Screen 1 layout
  final List<UserStatus> _activeUsers = [
    UserStatus(
      id: '1',
      name: 'Sarah Khan',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      isOnline: true,
      hasStory: true,
    ),
    UserStatus(
      id: '2',
      name: 'Ali Raza',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      isOnline: true,
      hasStory: true,
    ),
    UserStatus(
      id: '3',
      name: 'Usman Dev',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      isOnline: false,
      hasStory: false,
    ),
    UserStatus(
      id: '4',
      name: 'Fatima Z.',
      avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
      isOnline: true,
      hasStory: true,
    ),
    UserStatus(
      id: '5',
      name: 'Zaid Tech',
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      isOnline: true,
      hasStory: false,
    ),
  ];

  final List<ChatItem> _allChats = [
    ChatItem(
      id: 'c1',
      name: 'Sarah Khan',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      lastMessage: 'Flutter app screen 1 design looks super sleek! 🔥',
      time: '10:42 AM',
      unreadCount: 2,
      isOnline: true,
      isPinned: true,
    ),
    ChatItem(
      id: 'c2',
      name: 'Mobile Core Team 🚀',
      avatarUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150',
      lastMessage: 'Ali: Ready for the next screen creation!',
      time: '09:15 AM',
      unreadCount: 5,
      isOnline: true,
      isGroup: true,
      isPinned: true,
    ),
    ChatItem(
      id: 'c3',
      name: 'Ali Raza',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      lastMessage: 'typing...',
      time: 'Yesterday',
      unreadCount: 0,
      isOnline: true,
      isTyping: true,
    ),
    ChatItem(
      id: 'c4',
      name: 'Usman Dev',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      lastMessage: 'Firebase connection setup is ready.',
      time: 'Yesterday',
      unreadCount: 0,
      isOnline: false,
    ),
    ChatItem(
      id: 'c5',
      name: 'Fatima Z.',
      avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
      lastMessage: 'Voice note sent (0:45)',
      time: 'Aug 26',
      unreadCount: 1,
      isOnline: true,
    ),
    ChatItem(
      id: 'c6',
      name: 'AI Assistant Genkit',
      avatarUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
      lastMessage: 'How can I assist you with Flutter code today?',
      time: 'Aug 25',
      unreadCount: 0,
      isOnline: true,
    ),
  ];

  List<ChatItem> get _filteredChats {
    return _allChats.where((chat) {
      final matchesSearch = chat.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          chat.lastMessage.toLowerCase().contains(_searchQuery.toLowerCase());
      
      if (!matchesSearch) return false;

      if (_activeFilter == 'Unread') return chat.unreadCount > 0;
      if (_activeFilter == 'Groups') return chat.isGroup;
      if (_activeFilter == 'Archived') return false; // placeholder filter

      return true;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        title: Row(
          children: [
            ShaderMask(
              shaderCallback: (bounds) => AppColors.primaryGradient.createShader(bounds),
              child: const Text(
                'Waseem Chat',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  letterSpacing: -0.5,
                ),
              ),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.15),
                borderRadius: BorderRadius.circular(6),
              ),
              child: const Text(
                'PRO',
                style: TextStyle(
                  color: AppColors.primary,
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.camera_alt_outlined, color: AppColors.textPrimary),
            onPressed: () {},
          ),
          IconButton(
            icon: const Icon(Icons.edit_note_rounded, color: AppColors.primary, size: 28),
            onPressed: () {},
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            const SizedBox(height: 8),
            // Active contacts horizontal reel
            ActiveUsersBar(users: _activeUsers),
            const SizedBox(height: 12),
            // Search and Category Filters
            SearchAndFilterBar(
              onSearchChanged: (val) {
                setState(() {
                  _searchQuery = val;
                });
              },
              onFilterSelected: (filter) {
                setState(() {
                  _activeFilter = filter;
                });
              },
            ),
            const SizedBox(height: 12),
            // Conversations List Header
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'RECENT CHATS (${_filteredChats.length})',
                    style: const TextStyle(
                      color: AppColors.textMuted,
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1.0,
                    ),
                  ),
                  const Text(
                    'Mark all read',
                    style: TextStyle(
                      color: AppColors.primary,
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 4),
            // Conversations List
            Expanded(
              child: ListView.builder(
                itemCount: _filteredChats.length,
                itemBuilder: (context, index) {
                  final chat = _filteredChats[index];
                  return ChatTile(
                    chat: chat,
                    onTap: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Opening chat with ${chat.name}...'),
                          backgroundColor: AppColors.surface,
                          duration: const Duration(seconds: 1),
                        ),
                      );
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
      // Floating Action Button with gradient glow
      floatingActionButton: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(30),
          gradient: AppColors.primaryGradient,
          boxShadow: [
            BoxShadow(
              color: AppColors.primary.withOpacity(0.4),
              blurRadius: 16,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: FloatingActionButton(
          onPressed: () {},
          backgroundColor: Colors.transparent,
          elevation: 0,
          child: const Icon(Icons.message_rounded, color: Colors.white),
        ),
      ),
      // Bottom Navigation Bar
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          border: Border(
            top: BorderSide(
              color: Colors.white.withOpacity(0.05),
              width: 1,
            ),
          ),
        ),
        child: BottomNavigationBar(
          currentIndex: _currentNavIndex,
          onTap: (index) {
            setState(() {
              _currentNavIndex = index;
            });
          },
          backgroundColor: Colors.transparent,
          elevation: 0,
          type: BottomNavigationBarType.fixed,
          selectedItemColor: AppColors.primary,
          unselectedItemColor: AppColors.textMuted,
          selectedLabelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
          unselectedLabelStyle: const TextStyle(fontSize: 12),
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Icons.chat_bubble_rounded),
              label: 'Chats',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.call_rounded),
              label: 'Calls',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.donut_large_rounded),
              label: 'Status',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.settings_rounded),
              label: 'Settings',
            ),
          ],
        ),
      ),
    );
  }
}
