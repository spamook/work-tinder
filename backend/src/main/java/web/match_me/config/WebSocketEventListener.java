package web.match_me.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import web.match_me.service.PresenceService;

import java.security.Principal;

@Component
public class WebSocketEventListener {

    @Autowired
    private PresenceService presenceService;

    @EventListener
    public void handleWebSocketConnectListener(SessionConnectedEvent event) {
        Principal user = event.getUser();
        if (user != null) {
            presenceService.userConnected(user.getName());
        }
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        Principal user = event.getUser();
        if (user != null) {
            presenceService.userDisconnected(user.getName());
        }
    }
}
