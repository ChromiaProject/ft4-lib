#!/bin/sh
# Temporary CI diagnostic: dump the chr container's processes and JVM threads while globalSetup waits
API="http://${DOCKER_HOST#tcp://}"
for t in 60 100 140; do
  sleep 40
  for c in $(curl -s "$API/containers/json" | grep -o '"Id":"[0-9a-f]*","Names":\[[^]]*\],"Image":"[^"]*chr:[^"]*"' | sed 's/"Id":"\([0-9a-f]*\)".*/\1/'); do
    echo "=== chr container $c at ~${t}s"
    curl -s "$API/containers/$c/json" | head -c 3000; echo
    e=$(curl -s -X POST -H 'Content-Type: application/json' -d '{"AttachStdout":true,"AttachStderr":true,"Cmd":["sh","-c","ps -ef; ls -la /proc/1/fd /proc/$(pgrep java | head -1)/fd; cat /proc/$(pgrep java | head -1)/status | head -12; cat /proc/$(pgrep java | head -1)/wchan; echo; pkill -QUIT java"]}' "$API/containers/$c/exec" | sed 's/.*"Id":"\([0-9a-f]*\)".*/\1/')
    curl -s -X POST -H 'Content-Type: application/json' -d '{"Detach":false,"Tty":false}' "$API/exec/$e/start" | tr -d '\000-\010'
  done
done
