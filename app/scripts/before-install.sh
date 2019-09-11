#!/bin/bash

install_jdk_if_needed() {
    echo "Checking if JDK is installed..."
    if $(command -v javac >/dev/null 2>&1); then
        echo "JDK $(javac -version) installed"
    else
        apt install -y openjdk-8-jdk
        echo "JDK $(javac -version) installed"
    fi
}

install_postgres_if_needed() {
    echo "Checking if postgresql installed..."
    service postgresql status
    if [ "$?" -eq 4 ]; then
        apt install -y postgresql-10
    fi
    service postgresql start
}

setup_postgres_if_needed() {
    if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw postchain; then
        echo "Database 'postchain' exists"
    else
        echo "Creating databaase 'postchain'"
        sudo -u postgres psql -U postgres -c "create database postchain;"
        echo "Database created."
    fi

    if sudo -u postgres psql -t -c '\du' | cut -d \| -f 1 | grep -qw postchain; then
        echo "User 'postchain' exists."
    else
        echo "Creating postchian user..."
        sudo -u postgres psql -U postgres -c "create role postchain LOGIN ENCRYPTED PASSWORD 'postchain';"
        sudo -u postgres psql -U postgres -c "grant ALL ON DATABASE postchain TO postchain;"
        echo "User created."
    fi
}

"Updating apt..."
apt update

install_jdk_if_needed
install_postgres_if_needed
setup_postgres_if_needed

# TODO: FIX ME!!!
rm -rf /opt/ft3