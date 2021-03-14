#!/bin/bash

function usage {
    echo "Usage:        $0 -q|-f [-h, --help]"
    echo ""
    echo "Options:"
    echo "  -h, --help  Display help"
    echo "  -q          Run quick tests (No build)"
    echo "  -f          Run full tests (Build with no cache)"
    exit 1
}

function full_test {
    docker-compose down
    rm -rf backend/mongo-data
    docker-compose build --no-cache
    docker-compose up -d
    docker-compose -f backend/docker-compose.test.yml build
    docker-compose -f backend/docker-compose.test.yml run --rm backend-test
    rc=$?
    docker-compose down
    rm -rf backend/mongo-data
    exit $rc
}

function quick_test {
    docker-compose stop
    rm -rf backend/mongo-data
    docker-compose start
    docker-compose -f backend/docker-compose.test.yml run --rm backend-test
    rc=$?
    exit $rc
}

while getopts "hqf" option
do
    case $option in
        h|--help)
            usage
            ;;
        q|--quick)
            quick_test
            ;;
        f|--full)
            full_test
            ;;
        *)
            usage
            ;;
    esac
done
if [ $OPTIND -eq 1 ]; then usage; fi


