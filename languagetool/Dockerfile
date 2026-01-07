FROM erikvl87/languagetool:latest

USER root

# Install Node.js
RUN apk update
RUN apk add --no-cache nodejs npm

# Install fasttext and the language identification model
RUN apk add --no-cache fasttext
RUN wget https://dl.fbaipublicfiles.com/fasttext/supervised-models/lid.176.bin -O /LanguageTool/lid.176.bin

RUN echo "fasttextModel=/LanguageTool/lid.176.bin" > /LanguageTool/server.properties
RUN echo "fasttextBinary=/usr/bin/fasttext" >> /LanguageTool/server.properties

# Create API directory
RUN mkdir -p /app/lt-api

# Copy the rule management API
COPY api.js package.json /app/lt-api/

# Install Node.js dependencies
WORKDIR /app/lt-api
RUN npm install --production

# Expose LanguageTool port and API port
EXPOSE 8010 8020

USER languagetool

WORKDIR /app/lt-api
ENTRYPOINT ["/usr/bin/node", "api.js"]
