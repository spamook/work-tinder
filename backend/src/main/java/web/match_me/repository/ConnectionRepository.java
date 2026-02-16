package web.match_me.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import web.match_me.entity.Connection;
import web.match_me.entity.User;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConnectionRepository extends JpaRepository<Connection, Long> {
    
    @Query("SELECT c FROM Connection c WHERE (c.requester = :user1 AND c.receiver = :user2) OR (c.requester = :user2 AND c.receiver = :user1)")
    Optional<Connection> findConnectionBetweenUsers(@Param("user1") User user1, @Param("user2") User user2);

    List<Connection> findByReceiverAndStatus(User receiver, Connection.ConnectionStatus status);

    @Query("SELECT c FROM Connection c WHERE (c.requester = :user OR c.receiver = :user) AND c.status = 'ACCEPTED'")
    List<Connection> findAllAcceptedConnections(@Param("user") User user);
}
