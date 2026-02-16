package web.match_me.controller;

import web.match_me.service.DataSeedingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin")
public class AdminController {

    @Autowired
    private DataSeedingService dataSeedingService;

    @PostMapping("/seed")
    public ResponseEntity<String> seedData() {
        dataSeedingService.seedUsers(100);
        return ResponseEntity.ok("Database seeded successfully with 100 users.");
    }
}
