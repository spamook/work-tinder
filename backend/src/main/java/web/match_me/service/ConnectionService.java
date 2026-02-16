package web.match_me.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import web.match_me.entity.Connection;
import web.match_me.entity.User;
import web.match_me.repository.ConnectionRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class ConnectionService {
    // checking status "ACCEPTED" between users

    @Autowired
    private web.match_me.repository.RecommendationDismissalRepository dismissalRepository;

    @Autowired
    private ConnectionRepository connectionRepository;

    public boolean areConnected(User user1, User user2) {
        return connectionRepository.findConnectionBetweenUsers(user1, user2)
                .map(c -> c.getStatus() == Connection.ConnectionStatus.ACCEPTED)
                .orElse(false);
    }

    // checking active request "PENDING"
    public boolean hasConnectionRequest(User user1, User user2) {
        return connectionRepository.findConnectionBetweenUsers(user1, user2)
                .map(c -> c.getStatus() == Connection.ConnectionStatus.PENDING)
                .orElse(false); // checks if *any* request exists between them
    }

    // requests
    public Connection sendConnectionRequest(User requester, User receiver) {
        if (requester.equals(receiver)) {
            throw new IllegalArgumentException("Cannot connect with self");
        }
        Optional<Connection> existing = connectionRepository.findConnectionBetweenUsers(requester, receiver);
        if (existing.isPresent()) {
            throw new IllegalStateException("Connection or request already exists");
        }

        Connection connection = new Connection();
        connection.setRequester(requester);
        connection.setReceiver(receiver);
        connection.setStatus(Connection.ConnectionStatus.PENDING);
        connection.setCreatedAt(LocalDateTime.now());

        return connectionRepository.save(connection);
    }

    public Connection acceptConnectionRequest(Long connectionId, User receiver) {
        Connection connection = connectionRepository.findById(connectionId)
                .orElseThrow(() -> new IllegalArgumentException("Connection not found"));

        if (!connection.getReceiver().equals(receiver)) {
            throw new SecurityException("Not authorized to accept this request");
        }
        if (connection.getStatus() != Connection.ConnectionStatus.PENDING) {
            throw new IllegalStateException("Connection is not pending");
        }

        connection.setStatus(Connection.ConnectionStatus.ACCEPTED);
        return connectionRepository.save(connection);
    }

    public void rejectConnectionRequest(Long connectionId, User receiver) {
        Connection connection = connectionRepository.findById(connectionId)
                .orElseThrow(() -> new IllegalArgumentException("Connection not found"));

        if (!connection.getReceiver().equals(receiver)) {
            throw new SecurityException("Not authorized to reject this request");
        }

        // Save dismissal so they don't appear in recommendations immediately (only if
        // not already dismissed)
        if (dismissalRepository.findByUserAndDismissedUser(receiver, connection.getRequester()).isEmpty()) {
            web.match_me.entity.RecommendationDismissal dismissal = new web.match_me.entity.RecommendationDismissal();
            dismissal.setUser(receiver);
            dismissal.setDismissedUser(connection.getRequester());
            dismissal.setDismissedAt(LocalDateTime.now());
            dismissalRepository.save(dismissal);
        }

        // Requirement says "disconnect" separate
        // Assuming reject is for requests, disconnect is for active
        connectionRepository.delete(connection); // Or set to DECLINED if we want history
    }

    public void disconnect(Long connectionId, User requestor) {
        Connection connection = connectionRepository.findById(connectionId)
                .orElseThrow(() -> new IllegalArgumentException("Connection not found"));

        // Check if user is part of connection
        if (!connection.getRequester().equals(requestor) && !connection.getReceiver().equals(requestor)) {
            throw new SecurityException("Not authorized to disconnect");
        }

        connectionRepository.delete(connection);
    }

    public List<Connection> getPendingRequests(User user) {
        return connectionRepository.findByReceiverAndStatus(user, Connection.ConnectionStatus.PENDING);
    }

    public List<Connection> getMyConnections(User user) {
        return connectionRepository.findAllAcceptedConnections(user);
    }
}
