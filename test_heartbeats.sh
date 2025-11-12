#!/bin/bash

# Test script for heartbeat system
# This will connect, login, and test various heartbeat features

echo "Testing EntityManager Heartbeat System"
echo "======================================="
echo ""

# Use expect-like behavior with netcat
(
  sleep 1
  echo "testplayer"
  sleep 1
  echo "password123"
  sleep 2
  echo "look"
  sleep 1
  echo "open chest"
  sleep 1
  echo "get torch"
  sleep 1
  echo "inventory"
  sleep 1
  echo "north"
  sleep 2
  echo "look"
  sleep 15  # Wait to see healing fountain effects
  echo "south"
  sleep 1
  echo "look"
  sleep 30  # Wait to see torch burn and rat wander
  echo "quit"
) | nc localhost 4000

echo ""
echo "Test complete!"
