package web.match_me.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class MainController {

    @GetMapping("/")
    public String allAccess() {
        return "Everyone access";
    }

    @GetMapping("/user")
    public String userAccess() {
        return "User Content with JWT";
    }

    @GetMapping("/special")
    public String specialAccess() {
        return "Special access with JWT";
    }
}
