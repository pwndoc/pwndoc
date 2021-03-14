function Custom(res, status, code, message){
    res.status(code).json({"status": status, "datas": message});
};
exports.Custom = Custom;

/*
*** Codes 2xx ***
*/

function Ok(res, data){
    res.status(200).json({"status": "success", "datas": data});
};
exports.Ok = Ok;

function Created(res, data){
    res.status(201).json({"status": "success", "datas": data});
};
exports.Created = Created;

function NoContent(res, data){
    res.status(204).json({"status": "success", "datas": data});
};
exports.NoContent = NoContent;

function SendFile(res, filename, file){
    res.set({"Content-Disposition": `attachment; filename="${filename}"`});
    res.status(200).send(file);
}
exports.SendFile = SendFile;

function SendImage(res, image){
    res.set({"Content-Type": "image/png", "Content-Length": image.length});
    res.status(200).send(image);
}
exports.SendImage = SendImage;

/*
*** Codes 4xx ***
*/

function BadRequest(res, error){
    res.status(400).json({"status": "error", "datas": error});
};
exports.BadRequest = BadRequest;

function NotFound(res, error){
    res.status(404).json({"status": "error", "datas": error});
};
exports.NotFound = NotFound;

function BadParameters(res, error){
    res.status(422).json({"status": "error", "datas": error});
};
exports.BadParameters = BadParameters;

function Unauthorized(res, error){
    res.status(401).json({"status": "error", "datas": error});
};
exports.Unauthorized = Unauthorized;

function Forbidden(res, error){
    res.status(403).json({"status": "error", "datas": error});
};
exports.Forbidden = Forbidden;

/*
*** Codes 5xx ***
*/

function Internal(res, error){
    if (error.fn) var fn = exports[error.fn];
    if (typeof(fn) === 'function')
        fn(res, error.message);
    else if (error.errmsg) {
        res.status(500).json({"status": "error", "datas": error.errmsg});
    }   
    else {
        res.status(500).json({"status": "error", "datas": error});
    }
};
exports.Internal = Internal;