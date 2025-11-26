#!/bin/bash
# Script to set Firebase Functions environment variables

echo "Setting Firebase Functions environment variables..."

firebase functions:config:set \
  sendcloud.public_key="VPyKLwWkYT9YgUwTuN_tuJV9HiRFk" \
  sendcloud.secret_key="6c19a7171051484090c3604fe402b5ed" \
  searates.api_key="K-21EB16AA-B6A6-4D41-9365-5882597F9B11" \
  geoapify.key="b0b098c3980140a9a8f6895c34f1bb29" \
  gemini.api_key="AIzaSyCI7VPyKI-wWkYT9YgUwTuN_tuJV9HtRFk"

echo "Environment variables set! Now deploy functions:"
echo "firebase deploy --only functions"
