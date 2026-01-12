#!/bin/bash

function usage {
    echo "Usage:        $0 -f [-h, --help]"
    echo ""
    echo "Options:"
    echo "  -h, --help  Display help"
    echo "  -f          Run full tests (Build with no cache)"
    exit 1
}

function full_test {
    cd frontend
    npm i
    npm run test:run
    rc=$?
    cd ..
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


