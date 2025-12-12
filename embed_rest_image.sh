#!/bin/bash
# Script to embed quarter-rest.png as base64 into s_l_m_composer.html

cd /home/mrdangerous/Desktop/music_teaching_assistant/modules

# Get base64 encoding
BASE64_DATA=$(base64 -w 0 quarter-rest.png)

# Create the data URI
DATA_URI="data:image/png;base64,$BASE64_DATA"

# Replace the image source in the HTML file
sed -i "s|restImage.src = 'music_note_assets/quarter-rest.png';|restImage.src = '$DATA_URI';|" s_l_m_composer.html

echo "Successfully embedded quarter-rest.png into s_l_m_composer.html"
echo "The file is now self-contained and can be shared independently!"
