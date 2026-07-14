# Gateway image for the DEPLOYED topology (serves the React build + proxies).
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/nginx.conf
# In deployment, copy the built React app here so "/" serves the UI:
# COPY --from=<client build> /app/dist /usr/share/nginx/html
