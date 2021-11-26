FROM node:16
COPY node_modules /node_modules
COPY dist /dist
CMD [ "/dist/main.js" ]