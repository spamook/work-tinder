The project is not going to run unless a `.env` file is created in the root directory of /backend folder.

# Match-me

## Description

Match-me is a web application that helps employees find employers and vice versa. It is a platform for job seekers and employers to connect and find the best matches for their needs.

And all that in tinder-style.

## Prerequisites

java 21

npm installed

## How to run

Run the following command from /backend folder to start the backend:

`./mvnw spring-boot:run`

Run the following command from /frontend folder to start the frontend:

`npm install`

`npm run dev`

---

All testing endpoints(both API for developerns and Frontend) available here:

`https://team22-9318.postman.co/workspace/match-me~a8b68459-671a-40ac-b691-7835fab4e76b/collection/28164891-16210832-899a-4f32-9787-f60612ca2605?action=share&creator=28164891`

---

Info for future development:

For prod use these:

Frontend:

`npm run build`

`npm run preview`

Backend:

`./mvnw clean package`

`java -jar target/*.jar`
