# Specify colors utilized in the terminal
red=$(tput setaf 1)                        #  red
grn=$(tput setaf 2)                        #  green
ylw=$(tput setaf 3)                        #  yellow
blu=$(tput setaf 4)                        #  blue
cya=$(tput rev)$(tput bold)$(tput setaf 6) #  bold cyan reversed
ylr=$(tput rev)$(tput bold)$(tput setaf 3) #  bold yellow reversed
grr=$(tput rev)$(tput bold)$(tput setaf 2) #  bold green reversed
rer=$(tput rev)$(tput bold)$(tput setaf 1) #  bold red reversed
txtrst=$(tput sgr0)                        #  Reset

echo ${ylr}"Will deploy to server"${txtrst}
SSH="myHetzner"

echo ${ylr}"NPM build"${txtrst}
npm run build
if [ $? -ne 0 ]; then
    echo ${red}"🔥 error: Build is not successfull. Exiting..."${txtrst} && exit 1
fi

BUILD_FILE_NAME=tg-birthday-bot-apis-$(date +'%Y-%m-%dT%H%M').tar.gz
echo -e ${grn}"Build file name: $BUILD_FILE_NAME"${txtrst}

echo ${ylr}"Compress the build"${txtrst}
tar -czvf $BUILD_FILE_NAME -C ./build .
if [ $? -ne 0 ]; then
    echo -e ${red}"🔥 error: Cannot compress build"${txtrst} && exit 1
fi

echo ${ylr}"Copy the build to server"${txtrst}
scp -Cpr $BUILD_FILE_NAME ${SSH}:/home/arghyac35

# Check if scp is successful
if [ $? -eq 0 ];
then
    echo  ${ylr}"Deploy the build to server"${txtrst}
    ssh ${SSH} "cd ~/backends/telegram-birthday-bot && rm -rf build/* && tar -C build -zxvf ~/$BUILD_FILE_NAME && git stash save && git pull && yarn && pm2 restart tg-bd-bot && rm -rf ~/$BUILD_FILE_NAME"
else
    echo -e ${red}"🔥 error: Failed to copy build to server"${txtrst}
fi
rm $BUILD_FILE_NAME
