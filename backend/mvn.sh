#!/usr/bin/env bash
# Ensures Maven always uses Java 21 (Homebrew) regardless of system JAVA_HOME.
# Usage: ./mvn.sh [any maven args]
#   e.g: ./mvn.sh compile
#        ./mvn.sh clean package -DskipTests

export JAVA_HOME=/opt/homebrew/opt/openjdk@21
exec mvn "$@"
