package web.match_me.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.beans.factory.annotation.Autowired;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Enable simple broker for /queue (user-specific messages)
        config.enableSimpleBroker("/queue");
        // Prefix for messages from client to server
        config.setApplicationDestinationPrefixes("/app");
    }

    @Autowired
    private WebSocketAuthInterceptor authInterceptor;

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // WebSocket endpoint - clients connect here
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*");
    }

    @Override
    public void configureClientInboundChannel(
            org.springframework.messaging.simp.config.ChannelRegistration registration) {
        registration.interceptors(authInterceptor);
    }
}
