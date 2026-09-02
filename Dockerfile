# syntax=docker/dockerfile:1
# Xếp Gạch — static PWA served by nginx under /blockpuzzle/ for the Lazybutts
# hub (routed by caddy at chat.lazybutts.com/blockpuzzle/*). No build step:
# the game is plain HTML/CSS/JS with relative asset paths.
FROM nginx:alpine
COPY index.html style.css tetris.js main.js manifest.json sw.js /usr/share/nginx/html/blockpuzzle/
COPY icons /usr/share/nginx/html/blockpuzzle/icons
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
