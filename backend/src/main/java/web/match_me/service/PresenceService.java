package web.match_me.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import web.match_me.entity.Connection;
import web.match_me.entity.User;
import web.match_me.repository.UserRepository;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

@Service
public class PresenceService {

    private final Map<Long, Boolean> onlineUsers = new ConcurrentHashMap<>();
    private final Map<Long, ScheduledFuture<?>> disconnectTasks = new ConcurrentHashMap<>();
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private ConnectionService connectionService;

    @Autowired
    private UserRepository userRepository;

    public void userConnected(String email) {
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null)
            return;

        // Cancel any pending disconnect task
        ScheduledFuture<?> task = disconnectTasks.remove(user.getId());
        if (task != null) {
            task.cancel(false);
        }

        if (!onlineUsers.containsKey(user.getId())) {
            onlineUsers.put(user.getId(), true);
            broadcastStatus(user, true);
        }
    }

    public void userDisconnected(String email) {
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null)
            return;

        // Schedule disconnect
        ScheduledFuture<?> task = scheduler.schedule(() -> {
            disconnectTasks.remove(user.getId());
            onlineUsers.remove(user.getId());
            broadcastStatus(user, false);
        }, 2, TimeUnit.SECONDS); // 2 seconds delay

        disconnectTasks.put(user.getId(), task);
    }

    public boolean isUserOnline(Long userId) {
        return onlineUsers.containsKey(userId);
    }

    private void broadcastStatus(User user, boolean isOnline) {
        List<Connection> connections = connectionService.getMyConnections(user);

        Map<String, Object> payload = Map.of(
                "userId", user.getId(),
                "isOnline", isOnline);

        for (Connection connection : connections) {
            User friend = connection.getRequester().equals(user) ? connection.getReceiver() : connection.getRequester();
            messagingTemplate.convertAndSend("/queue/presence-user" + friend.getId(), payload);
        }
    }
}
