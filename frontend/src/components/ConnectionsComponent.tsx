// ConnectionsComponent.tsx
import {
  useEffect,
  useState,
  useRef,
  useCallback,
  useLayoutEffect,
} from "react";
import {
  Card,
  ListGroup,
  Button,
  Container,
  Row,
  Col,
  Alert,
  Form,
  Badge,
  Modal,
} from "react-bootstrap";
import axios from "axios";
import { useAuth } from "../AuthContext";
import { Navigate } from "react-router-dom";
import { useWebSocket } from "../WebSocketContext";

interface FriendRequest {
  profilePictureUrl: string;
  requesterId: number;
  requesterName: string;
  requesterLastName: string;
  connectionId: number;
  sentAt: number[];
  education: string;
  languages: string;
  gender: string;
  bio: string;
  experience: string[];
  skills: string[];
  additionalCertificates: string;
  location: string;
}

interface Connection {
  profilePictureUrl: string;
  connectedAt: number[];
  connectionId: number;
  userId: number;
  username: string;
  lastName: string;
  education: string;
  languages: string;
  gender: string;
  bio: string;
  experience: string[];
  skills: string[];
  additionalCertificates: string;
  location: string;
  lastMessageTime?: number[]; // For sorting
  lastMessageSentAt?: number[] | null; // Last message timestamp from API
  unreadCount?: number;
  isOnline?: boolean;
}

interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  sentAt?: number[];
  timestamp?: number[];
  read: boolean;
}

type View = "requests" | "chats" | "chat-detail";

function ConnectionsComponent() {
  const { authorized, userId } = useAuth();
  const [activeTab, setActiveTab] = useState<"requests" | "chats">("requests");
  const [currentView, setCurrentView] = useState<View>("requests");
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Connection | null>(null);
  // Ref to access current selectedFriend inside socket callbacks
  const selectedFriendRef = useRef<Connection | null>(null);

  useEffect(() => {
    selectedFriendRef.current = selectedFriend;
  }, [selectedFriend]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Modal state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<
    FriendRequest | Connection | null
  >(null);

  // Pagination state
  const [page, setPage] = useState(0);
  const [startOfChatReached, setStartOfChatReached] = useState(false);
  const [isFetchingOldMessages, setIsFetchingOldMessages] = useState(false);

  // Ref for auto-scroll
  const chatMessagesRef = useRef<HTMLDivElement>(null);

  // Typing indicator state
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // State to control initial scroll to bottom
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(false);

  // Ref to preserve scroll position during pagination
  const previousScrollHeightRef = useRef<number>(0);

  // Redirect if not authorized
  if (!authorized) {
    return <Navigate to="/login" replace />;
  }

  // Fetch data based on active tab
  useEffect(() => {
    if (activeTab === "requests") {
      fetchFriendRequests();
    } else if (activeTab === "chats") {
      fetchConnections();
    }
  }, [activeTab]);

  // Auto-scroll chat messages - modified to only scroll on initial load
  useEffect(() => {
    if (
      currentView === "chat-detail" &&
      chatMessagesRef.current &&
      shouldScrollToBottom &&
      messages.length > 0 &&
      !loading
    ) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
      setShouldScrollToBottom(false);
    }
  }, [messages, currentView, shouldScrollToBottom, loading]);

  // Adjust scroll position after pagination to keep view stable
  useLayoutEffect(() => {
    if (
      chatMessagesRef.current &&
      previousScrollHeightRef.current > 0 &&
      messages.length > 0
    ) {
      // Calculate how much the content height increased
      const newScrollHeight = chatMessagesRef.current.scrollHeight;
      const heightDifference =
        newScrollHeight - previousScrollHeightRef.current;

      // Adjust scroll position to maintain visual stability
      // We add the height difference to the current scrollTop
      chatMessagesRef.current.scrollTop += heightDifference;

      // Reset the ref
      previousScrollHeightRef.current = 0;
    }
  }, [messages]);

  // Helper function to sort connections by most recent message (reusable)
  // Defined before WebSocket useEffect to avoid stale closure issues
  const sortConnections = useCallback(
    (connectionsToSort: Connection[]): Connection[] => {
      return [...connectionsToSort].sort((a, b) => {
        // Helper to convert timestamp array to Date
        const toDate = (arr: number[] | null | undefined): Date | null => {
          if (!arr || arr.length < 6) return null;
          return new Date(arr[0], arr[1] - 1, arr[2], arr[3], arr[4], arr[5]);
        };

        const lastMsgA = toDate(a.lastMessageSentAt);
        const lastMsgB = toDate(b.lastMessageSentAt);

        // If both have messages, sort by last message time
        if (lastMsgA && lastMsgB) {
          return lastMsgB.getTime() - lastMsgA.getTime();
        }
        // If only one has messages, it comes first
        if (lastMsgA && !lastMsgB) return -1;
        if (!lastMsgA && lastMsgB) return 1;

        // Neither has messages, sort by connectedAt
        const dateA = new Date(
          a.connectedAt[0],
          a.connectedAt[1] - 1,
          a.connectedAt[2],
          a.connectedAt[3],
          a.connectedAt[4],
          a.connectedAt[5],
        );
        const dateB = new Date(
          b.connectedAt[0],
          b.connectedAt[1] - 1,
          b.connectedAt[2],
          b.connectedAt[3],
          b.connectedAt[4],
          b.connectedAt[5],
        );
        return dateB.getTime() - dateA.getTime();
      });
    },
    [],
  );

  // WebSocket connection for real-time messages & presence
  const { client, isConnected } = useWebSocket();

  useEffect(() => {
    if (!userId || !client || !isConnected) return;

    // Subscribe to user's message queue
    const messageSub = client.subscribe(
      `/queue/messages-user${userId}`,
      (message) => {
        const receivedMessage = JSON.parse(message.body);
        // Message format is same as REST API - timestamp is array [year, month, day, hour, minute, second, nano]
        const messageData: Message = {
          id: receivedMessage.id,
          senderId: receivedMessage.senderId,
          receiverId: receivedMessage.receiverId,
          content: receivedMessage.content,
          timestamp: receivedMessage.timestamp,
          read: false,
        };
        // Append message to the list
        setMessages((prev) => [...prev, messageData]);
        // Reorder connections - move sender to top
        setConnections((prev) => {
          const updated = prev.map((conn) => {
            if (conn.userId === receivedMessage.senderId) {
              // If this is the active chat, mark as read immediately (optimistic)
              const isChatOpen =
                selectedFriendRef.current?.userId === conn.userId;
              return {
                ...conn,
                lastMessageSentAt: receivedMessage.timestamp,
                unreadCount: isChatOpen ? 0 : (conn.unreadCount || 0) + 1,
              };
            }
            return conn;
          });
          return sortConnections(updated);
        });
        // Clear typing indicator - sender finished typing and sent message
        setIsPartnerTyping(false);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
      },
    );

    // Subscribe to typing indicator queue
    const typingSub = client.subscribe(
      `/queue/typing-user${userId}`,
      (message) => {
        const typingEvent = JSON.parse(message.body);
        if (typingEvent.isTyping) {
          setIsPartnerTyping(true);
          // Clear existing timeout
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
          // Auto-hide after 3 seconds of no typing activity
          typingTimeoutRef.current = setTimeout(() => {
            setIsPartnerTyping(false);
          }, 3000);
        }
      },
    );

    // Subscribe to read notifications (to clear badges on other devices/tabs)
    const readSub = client.subscribe(
      `/queue/messages-read-user${userId}`,
      (message) => {
        const data = JSON.parse(message.body);
        const senderId = data.senderId;
        setConnections((prev) =>
          prev.map((conn) =>
            conn.userId === senderId ? { ...conn, unreadCount: 0 } : conn,
          ),
        );
      },
    );

    // Subscribe to presence updates
    const presenceSub = client.subscribe(
      `/queue/presence-user${userId}`,
      (message) => {
        const data = JSON.parse(message.body);
        const { userId: friendId, isOnline } = data;

        setConnections((prev) => {
          const updated = prev.map((conn) =>
            conn.userId === friendId ? { ...conn, isOnline } : conn,
          );

          // Also update selectedFriend if it's the one who changed status
          if (selectedFriendRef.current?.userId === friendId) {
            setSelectedFriend((prev) => (prev ? { ...prev, isOnline } : null));
          }

          return updated;
        });
      },
    );

    return () => {
      // Subscriptions are automatically cleaned up when client disconnects/reconnects usually,
      // but strictly good practice to unsubscribe if client persists.
      // With stompjs v5+, unsubscribe is on the subscription object.
      messageSub.unsubscribe();
      typingSub.unsubscribe();
      readSub.unsubscribe();
      presenceSub.unsubscribe();

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [userId, client, isConnected, sortConnections]);

  // Format timestamp array to readable date
  const formatDate = (dateArray: number[]): string => {
    if (!dateArray || dateArray.length < 6) return "Unknown date";
    const [year, month, day, hour, minute, second] = dateArray;
    const date = new Date(year, month - 1, day, hour, minute, second);
    return date.toLocaleString();
  };

  // Format timestamp for chat - ALWAYS show date and time
  const formatChatTime = (dateArray: number[]): string => {
    if (!dateArray || dateArray.length < 6) return "";
    const [year, month, day, hour, minute] = dateArray;
    const date = new Date(year, month - 1, day, hour, minute);

    // Always show both date and time
    return (
      date.toLocaleDateString() +
      " " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  };

  // Fetch friend requests
  const fetchFriendRequests = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    setLoading(true);
    setError("");

    try {
      const response = await axios.get(
        "http://localhost:8080/connections/requests",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setFriendRequests(response.data);
    } catch (err: any) {
      setError("Failed to load friend requests");
    } finally {
      setLoading(false);
    }
  };

  // Fetch connections (friends) and sort by most recent
  const fetchConnections = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    setLoading(true);
    setError("");

    try {
      const response = await axios.get("http://localhost:8080/connections", {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Sort and set connections using reusable function
      setConnections(sortConnections(response.data));
    } catch (err: any) {
      setError("Failed to load connections");
    } finally {
      setLoading(false);
    }
  };

  // Fetch chat history
  const fetchChatHistory = async (friendId: number, pageNum: number = 0) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    if (pageNum === 0) {
      setLoading(true);
    } else {
      setIsFetchingOldMessages(true);
    }
    setError("");

    try {
      const response = await axios.get(
        `http://localhost:8080/messages/${friendId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { page: pageNum, size: 20 },
        },
      );

      const { messages: newMessages, startOfChatReached: reached } =
        response.data;

      if (pageNum === 0) {
        setMessages(newMessages);
      } else {
        // Capture scroll height before prepending messages
        if (chatMessagesRef.current) {
          previousScrollHeightRef.current =
            chatMessagesRef.current.scrollHeight;
        }
        // Prepend new messages
        setMessages((prev) => [...newMessages, ...prev]);
      }

      setStartOfChatReached(reached);
      setPage(pageNum);
    } catch (err: any) {
      setError("Failed to load chat history");
    } finally {
      if (pageNum === 0) {
        setLoading(false);
      } else {
        setIsFetchingOldMessages(false);
      }
    }
  };

  // Accept friend request
  const handleAccept = async (connectionId: number) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      await axios.post(
        `http://localhost:8080/connections/accept/${connectionId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setSuccess("Friend request accepted!");
      fetchFriendRequests(); // Refresh the list

      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError("Failed to accept request");
    } finally {
      setActionLoading(false);
    }
  };

  // Reject friend request
  const handleReject = async (connectionId: number) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      await axios.post(
        `http://localhost:8080/connections/reject/${connectionId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setSuccess("Friend request rejected");
      fetchFriendRequests(); // Refresh the list

      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError("Failed to reject request");
    } finally {
      setActionLoading(false);
    }
  };

  // Disconnect from friend
  const handleDisconnect = async (friendId: number) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    if (
      !window.confirm("Are you sure you want to disconnect from this friend?")
    ) {
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      await axios.delete(`http://localhost:8080/connections/${friendId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSuccess("Disconnected successfully");
      fetchConnections(); // Refresh the list

      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError("Failed to disconnect");
    } finally {
      setActionLoading(false);
    }
  };

  // Open chat with friend
  const handleOpenChat = (friend: Connection) => {
    setShouldScrollToBottom(true);
    setMessages([]);
    setSelectedFriend(friend);
    setCurrentView("chat-detail");
    // Reset pagination
    setPage(0);
    setStartOfChatReached(false);
    fetchChatHistory(friend.userId, 0);

    // Mark messages as read if there are unread messages
    if (friend.unreadCount && friend.unreadCount > 0) {
      // Update local state immediately
      setConnections((prev) =>
        prev.map((c) =>
          c.userId === friend.userId ? { ...c, unreadCount: 0 } : c,
        ),
      );

      // Call API
      const token = localStorage.getItem("token");
      if (token) {
        axios
          .post(
            `http://localhost:8080/messages/read/${friend.userId}`,
            {},
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          )
          .catch((err) => console.error("Failed to mark read", err));
      }
    }
  };

  // Go back to friends list
  const handleGoBack = () => {
    setCurrentView("chats");
    setSelectedFriend(null);
    setMessages([]);
    setMessageText("");
    setPage(0);
    setStartOfChatReached(false);
    setIsFetchingOldMessages(false);
  };

  // Scroll handler for infinite scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (
      !selectedFriend ||
      loading ||
      isFetchingOldMessages ||
      startOfChatReached
    )
      return;

    const { scrollTop } = e.currentTarget;
    if (scrollTop === 0) {
      // User scrolled to top, load next page
      fetchChatHistory(selectedFriend.userId, page + 1);
    }
  };

  // Handle typing indicator - send immediately, then throttle subsequent calls
  const lastTypingSentRef = useRef<number>(0);
  const handleTyping = async () => {
    if (!selectedFriend) return;

    const now = Date.now();
    // Throttle: only send if 200ms has passed since last send
    if (now - lastTypingSentRef.current < 200) return;
    lastTypingSentRef.current = now;

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      await axios.post(
        "http://localhost:8080/messages/typing",
        { receiverId: selectedFriend.userId },
        { headers: { Authorization: `Bearer ${token}` } },
      );
    } catch (_err) {
      // Silently ignore typing indicator errors
    }
  };

  // Scroll to bottom of chat manually
  const scrollToBottom = () => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTo({
        top: chatMessagesRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  // Send message
  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedFriend) return;
    // Clear typing indicator when message is sent
    setIsPartnerTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    setActionLoading(true);
    setError("");

    try {
      const response = await axios.post(
        "http://localhost:8080/messages/send",
        {
          receiverId: selectedFriend.userId,
          content: messageText.trim(),
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      // Create message from response or construct fallback
      const newMessage: Message = {
        id: response.data?.id || Date.now(),
        senderId: response.data?.senderId || 0,
        receiverId: response.data?.receiverId || selectedFriend.userId,
        content: response.data?.content || messageText.trim(), // This is the key fix
        sentAt: response.data?.sentAt || [
          new Date().getFullYear(),
          new Date().getMonth() + 1,
          new Date().getDate(),
          new Date().getHours(),
          new Date().getMinutes(),
          new Date().getSeconds(),
          0,
        ],
        read: response.data?.read || false,
      };

      setMessages([...messages, newMessage]);
      setMessageText("");

      // Reorder connections - move current chat partner to top
      const now = new Date();
      const currentTimestamp: number[] = [
        now.getFullYear(),
        now.getMonth() + 1,
        now.getDate(),
        now.getHours(),
        now.getMinutes(),
        now.getSeconds(),
        0,
      ];
      setConnections((prev) => {
        const updated = prev.map((conn) =>
          conn.userId === selectedFriend.userId
            ? { ...conn, lastMessageSentAt: currentTimestamp }
            : conn,
        );
        return sortConnections(updated);
      });
    } catch (err: any) {
      setError("Failed to send message");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle tab change
  const handleTabChange = (tab: "requests" | "chats") => {
    setActiveTab(tab);
    setCurrentView(tab);
    setError("");
    setSuccess("");
  };

  // View profile handler
  const handleViewProfile = (profile: FriendRequest | Connection) => {
    setSelectedProfile(profile);
    setShowProfileModal(true);
  };

  // Render profile modal
  const renderProfileModal = () => {
    if (!selectedProfile) return null;

    const isFriendRequest = "requesterName" in selectedProfile;
    const name = isFriendRequest
      ? `${selectedProfile.requesterName} ${selectedProfile.requesterLastName}`
      : `${selectedProfile.username} ${selectedProfile.lastName}`;

    return (
      <Modal
        show={showProfileModal}
        onHide={() => setShowProfileModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Profile Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-center mb-4">
            {selectedProfile.profilePictureUrl ? (
              <img
                src={selectedProfile.profilePictureUrl}
                alt={name}
                style={{
                  width: "150px",
                  height: "150px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "3px solid #dee2e6",
                }}
              />
            ) : (
              <div
                style={{
                  width: "150px",
                  height: "150px",
                  margin: "0 auto",
                  borderRadius: "50%",
                  backgroundColor: "#f0f0f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "60px",
                  border: "3px solid #dee2e6",
                }}
              >
                👤
              </div>
            )}
            <h4 className="mt-3">{name}</h4>
          </div>

          <ListGroup variant="flush">
            <ListGroup.Item>
              <strong>Gender:</strong> {selectedProfile.gender || "N/A"}
            </ListGroup.Item>
            <ListGroup.Item>
              <strong>Location:</strong> {selectedProfile.location || "N/A"}
            </ListGroup.Item>
            <ListGroup.Item>
              <strong>Bio:</strong> {selectedProfile.bio || "N/A"}
            </ListGroup.Item>
            <ListGroup.Item>
              <strong>Education:</strong> {selectedProfile.education || "N/A"}
            </ListGroup.Item>
            <ListGroup.Item>
              <strong>Languages:</strong> {selectedProfile.languages || "N/A"}
            </ListGroup.Item>
            <ListGroup.Item>
              <strong>Skills:</strong>{" "}
              {selectedProfile.skills?.length > 0
                ? selectedProfile.skills.join(", ")
                : "N/A"}
            </ListGroup.Item>
            <ListGroup.Item>
              <strong>Experience:</strong>{" "}
              {selectedProfile.experience?.length > 0
                ? selectedProfile.experience.join(", ")
                : "N/A"}
            </ListGroup.Item>
            <ListGroup.Item>
              <strong>Certificates:</strong>{" "}
              {selectedProfile.additionalCertificates || "N/A"}
            </ListGroup.Item>
          </ListGroup>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="outline-secondary"
            onClick={() => setShowProfileModal(false)}
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    );
  };

  // Render content based on current view
  const renderMainContent = () => {
    if (currentView === "requests") {
      return (
        <div>
          <h4 className="mb-4">Friend Requests</h4>
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : friendRequests.length === 0 ? (
            <Alert variant="info">No pending friend requests</Alert>
          ) : (
            <ListGroup>
              {friendRequests.map((request) => (
                <ListGroup.Item
                  key={request.connectionId}
                  className="d-flex align-items-center justify-content-between connections-list-item"
                >
                  <div className="d-flex align-items-center connections-user-info">
                    <div
                      className="connections-pfp"
                      style={{
                        width: "50px",
                        height: "50px",
                        borderRadius: "50%",
                        backgroundColor: "#f0f0f0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "24px",
                        marginRight: "15px",
                        border: "2px solid #dee2e6",
                        overflow: "hidden",
                      }}
                    >
                      {request.profilePictureUrl ? (
                        <img
                          src={request.profilePictureUrl}
                          alt={request.requesterName}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        "👤"
                      )}
                    </div>
                    <div>
                      <h6 className="mb-0">
                        {request.requesterName} {request.requesterLastName}
                      </h6>
                      <small className="text-muted">
                        {formatDate(request.sentAt)}
                      </small>
                    </div>
                  </div>
                  <div className="d-flex gap-2 connections-actions">
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => handleViewProfile(request)}
                    >
                      View Profile
                    </Button>
                    <Button
                      variant="outline-success"
                      size="sm"
                      onClick={() => handleAccept(request.connectionId)}
                      disabled={actionLoading}
                    >
                      ✓ Accept
                    </Button>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => handleReject(request.connectionId)}
                      disabled={actionLoading}
                    >
                      ✕ Decline
                    </Button>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}
        </div>
      );
    } else if (currentView === "chats") {
      return (
        <div>
          <h4 className="mb-4">Your Connections</h4>
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : connections.length === 0 ? (
            <Alert variant="info">
              No connections yet. Start by accepting friend requests!
            </Alert>
          ) : (
            <ListGroup>
              {connections.map((connection) => (
                <ListGroup.Item
                  key={connection.connectionId}
                  className="d-flex align-items-center justify-content-between connections-list-item"
                >
                  <div
                    className="d-flex align-items-center flex-grow-1 connections-user-info"
                    onClick={() => handleOpenChat(connection)}
                    style={{ cursor: "pointer" }}
                  >
                    <div style={{ position: "relative", marginRight: "15px" }}>
                      <div
                        className="connections-pfp"
                        style={{
                          width: "50px",
                          height: "50px",
                          borderRadius: "50%",
                          backgroundColor: "#f0f0f0",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "24px",
                          border: connection.isOnline
                            ? "3px solid #77dd77"
                            : "2px solid #dee2e6",
                          overflow: "hidden",
                        }}
                      >
                        {connection.profilePictureUrl ? (
                          <img
                            src={connection.profilePictureUrl}
                            alt={connection.username}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          "👤"
                        )}
                      </div>
                      {(connection.unreadCount || 0) > 0 && (
                        <span
                          style={{
                            position: "absolute",
                            bottom: "-2px",
                            right: "-2px",
                            backgroundColor: "#dc3545",
                            color: "white",
                            borderRadius: "50%",
                            width: "20px",
                            height: "20px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "12px",
                            fontWeight: "bold",
                            border: "2px solid white",
                            lineHeight: "1",
                            padding: 0,
                            textAlign: "center",
                            boxSizing: "border-box",
                            paddingLeft: "1px", // Visual correction for centering
                          }}
                        >
                          {connection.unreadCount}
                        </span>
                      )}
                    </div>
                    <div>
                      <h6 className="mb-0">
                        {connection.username} {connection.lastName}
                      </h6>
                      <small className="text-muted">
                        Connected: {formatDate(connection.connectedAt)}
                      </small>
                    </div>
                  </div>
                  <div className="d-flex gap-2 connections-actions">
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewProfile(connection);
                      }}
                    >
                      View Profile
                    </Button>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDisconnect(connection.connectionId);
                      }}
                      disabled={actionLoading}
                    >
                      🔌 Disconnect
                    </Button>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}
        </div>
      );
    } else if (currentView === "chat-detail" && selectedFriend) {
      return (
        <div className="d-flex flex-column h-100">
          {/* Chat Header */}
          <div className="d-flex align-items-center justify-content-between mb-3 pb-3 border-bottom chat-header">
            <div className="d-flex align-items-center">
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={handleGoBack}
                className="me-3"
              >
                ← Back
              </Button>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  backgroundColor: "#f0f0f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                  marginRight: "10px",
                  border: selectedFriend.isOnline
                    ? "3px solid #77dd77"
                    : "2px solid #dee2e6",
                  overflow: "hidden",
                }}
              >
                {selectedFriend.profilePictureUrl ? (
                  <img
                    src={selectedFriend.profilePictureUrl}
                    alt={selectedFriend.username}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  "👤"
                )}
              </div>
              <h5 className="mb-0">{selectedFriend.username}</h5>
            </div>
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={scrollToBottom}
              className="ms-auto"
            >
              ↓
            </Button>
          </div>

          {/* Messages */}
          <div
            id="chat-messages"
            ref={chatMessagesRef}
            onScroll={handleScroll}
            className="flex-grow-1 overflow-auto mb-3 p-3 chat-messages"
            style={{
              backgroundColor: "#f8f9fa",
              borderRadius: "8px",
              maxHeight: "500px",
              minHeight: "400px",
            }}
          >
            {startOfChatReached && (
              <div className="text-center text-muted my-3">
                <small>
                  This is the beginning of your chat history with{" "}
                  {selectedFriend.username}
                </small>
              </div>
            )}

            {isFetchingOldMessages && (
              <div className="text-center my-2">
                <div
                  className="spinner-border spinner-border-sm text-secondary"
                  role="status"
                >
                  <span className="visually-hidden">Loading history...</span>
                </div>
              </div>
            )}

            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border" role="status">
                  <span className="visually-hidden">Loading messages...</span>
                </div>
              </div>
            ) : messages.length === 0 && !startOfChatReached ? (
              <div className="text-center text-muted py-5">
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.map((message, index) => {
                const isOwnMessage = message.senderId !== selectedFriend.userId;
                // Use actual ID or fallback to index if ID is missing (though ID should exist)
                // We need ID for scrollIntoView
                const msgId = message.id
                  ? `msg-${message.id}`
                  : `msg-idx-${index}`;

                return (
                  <div
                    id={msgId}
                    key={message.id || index}
                    className={`d-flex mb-3 ${isOwnMessage ? "justify-content-end" : "justify-content-start"}`}
                  >
                    <div
                      style={{
                        maxWidth: "70%",
                        padding: "10px 15px",
                        borderRadius: "15px",
                        backgroundColor: isOwnMessage ? "#007bff" : "#ffffff",
                        color: isOwnMessage ? "#ffffff" : "#000000",
                        border: isOwnMessage ? "none" : "1px solid #dee2e6",
                      }}
                    >
                      <div style={{ wordBreak: "break-word" }}>
                        {message.content}
                      </div>
                      <small
                        style={{
                          fontSize: "0.75rem",
                          opacity: 0.8,
                          display: "block",
                          marginTop: "5px",
                        }}
                      >
                        {formatChatTime(
                          message.sentAt || message.timestamp || [],
                        )}
                      </small>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Message Input */}
          {/* Typing indicator - fixed height to prevent layout shift */}
          <div
            style={{
              height: "24px",
              display: "flex",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            {isPartnerTyping && selectedFriend && (
              <span
                style={{
                  fontSize: "0.85rem",
                  color: "#6c757d",
                  fontStyle: "italic",
                }}
              >
                {selectedFriend.username} is typing
                <span className="typing-dots">
                  <span
                    style={{
                      animation: "typing-dot 1.4s infinite",
                      animationDelay: "0s",
                    }}
                  >
                    .
                  </span>
                  <span
                    style={{
                      animation: "typing-dot 1.4s infinite",
                      animationDelay: "0.2s",
                    }}
                  >
                    .
                  </span>
                  <span
                    style={{
                      animation: "typing-dot 1.4s infinite",
                      animationDelay: "0.4s",
                    }}
                  >
                    .
                  </span>
                </span>
                <style>{`
                  @keyframes typing-dot {
                    0%, 80%, 100% { opacity: 0; }
                    40% { opacity: 1; }
                  }
                `}</style>
              </span>
            )}
          </div>

          <div className="d-flex gap-2">
            <Form.Control
              type="text"
              placeholder="Type a message..."
              value={messageText}
              onChange={(e) => {
                setMessageText(e.target.value);
                handleTyping();
              }}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={actionLoading}
            />
            <Button
              variant="primary"
              onClick={handleSendMessage}
              disabled={actionLoading || !messageText.trim()}
            >
              {actionLoading ? (
                <span className="spinner-border spinner-border-sm" />
              ) : (
                "📤 Send"
              )}
            </Button>
          </div>
        </div>
      );
    }
  };

  return (
    <Container fluid>
      <Row>
        {/* Sidebar */}
        <Col
          md={3}
          lg={2}
          className="bg-light p-3 connections-sidebar"
          style={{ minHeight: "80vh" }}
        >
          <h5 className="mb-4">Connections</h5>
          <ListGroup>
            <ListGroup.Item
              action
              active={activeTab === "requests"}
              onClick={() => handleTabChange("requests")}
              className="d-flex justify-content-between align-items-center"
            >
              Friend Requests
              {friendRequests.length > 0 && (
                <Badge bg="danger" pill>
                  {friendRequests.length}
                </Badge>
              )}
            </ListGroup.Item>
            <ListGroup.Item
              action
              active={activeTab === "chats"}
              onClick={() => handleTabChange("chats")}
            >
              Chats
            </ListGroup.Item>
          </ListGroup>
        </Col>

        {/* Main Window */}
        <Col md={9} lg={10} className="p-4">
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError("")}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert variant="success" dismissible onClose={() => setSuccess("")}>
              {success}
            </Alert>
          )}

          <Card style={{ minHeight: "70vh" }}>
            <Card.Body className="d-flex flex-column">
              {renderMainContent()}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Profile Modal */}
      {renderProfileModal()}
    </Container>
  );
}

export default ConnectionsComponent;
