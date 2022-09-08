#!/bin/bash

LAT=-77.022845
LONG=-12.090783

# Basic while loop
while [ true ]
    do
        echo 'starting...'
        DEVICENAME="$2"
        TIME=$(date +%s)


        UPDATE="DeviceId=$DEVICENAME,Position=$LAT,$LONG,SampleTime=$TIME"

        echo "$UPDATE"

        aws location \
            batch-update-device-position \
            --tracker-name $1 \
            --updates $UPDATE

        let LAT+=1
        sleep 10
    done

echo All done