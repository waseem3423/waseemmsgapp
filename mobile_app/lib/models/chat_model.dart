class UserStatus {
  final String id;
  final String name;
  final String avatarUrl;
  final bool isOnline;
  final bool hasStory;

  UserStatus({
    required this.id,
    required this.name,
    required this.avatarUrl,
    this.isOnline = false,
    this.hasStory = false,
  });
}

class ChatItem {
  final String id;
  final String name;
  final String avatarUrl;
  final String lastMessage;
  final String time;
  final int unreadCount;
  final bool isOnline;
  final bool isGroup;
  final bool isPinned;
  final bool isTyping;

  ChatItem({
    required this.id,
    required this.name,
    required this.avatarUrl,
    required this.lastMessage,
    required this.time,
    this.unreadCount = 0,
    this.isOnline = false,
    this.isGroup = false,
    this.isPinned = false,
    this.isTyping = false,
  });
}
