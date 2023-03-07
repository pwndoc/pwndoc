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
    rm -rf backend/mongo-data-test
    docker-compose -f backend/docker-compose.test.yml build
    docker-compose -f backend/docker-compose.test.yml run --rm backend-test
    docker-compose -f backend/docker-compose.test.yml down
    docker-compose -f backend/docker-compose.test.yml rm
    rc=$?
    rm -rf backend/mongo-data-test
    exit $rc
}

while getopts "hf" option
do
    case $option in
        h|--help)
            usage
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


