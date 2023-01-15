import { Container, Row, Col, Form, Card, Button } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import "./app.css";
import React from "react";
import * as faceapi from "face-api.js";
import { v4 as uuidv4 } from 'uuid';

export default function App() {
    const [modelsLoaded, setModelsLoaded] = React.useState(false);
    React.useEffect(() => {
        const loadModels = async () => {
            const MODEL_URL = process.env.PUBLIC_URL + "/models";

            Promise.all([
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
                faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
            ]).then(setModelsLoaded(true));
        };
        loadModels();
    }, []);

    const [showImg, toggleImgDisplay] = React.useState(false);
    const [showFileLoader, toggleFileLoader] = React.useState(true);
    const [showForm, toggleForm] = React.useState(false);
    const [isLoading, checkLoad] = React.useState(false);
    const [imgSrc, getImg] = React.useState("");
    const [check, canCheck] = React.useState(false);
    const [add, canAdd] = React.useState(false);
    const [addName, canAddName] = React.useState(false);
    const [numFaces, getNumFaces] = React.useState(0);
    const [currFace, setFaces] = React.useState();
    const [imgName, setImgName] = React.useState("");
    const [savedImgs, setSavedImgs] = React.useState([]);
    const [checked, isChecked] = React.useState(false);
    const [retPrompt, setRetPrompt] = React.useState("");

    React.useEffect(() => {
        const imgNames = Object.keys(sessionStorage);
        setSavedImgs(imgNames);
    }, []);

    const messages = [
        "Sorry, face not detected. Please try another image",
        "Face detected!",
        "Sorry, your image has too many faces. Please try another image",
    ];

    //variable for the name regex
    const regexNameInput = /^[a-z A-Z]+$/g; //allows only characters and spaces, checks globally, ^ and $ check for whole line (^ anchor for begining, $ anchor for end)

    function displayImg(props) {
        toggleFileLoader(false);
        checkLoad(true);
        const file = props.target.files[0];
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            getImg(reader.result);
        };
        if (modelsLoaded) {
            getFace(file).then((faces) => {
                checkNumFaces(faces);
                setFaces(faces);
                toggleImgDisplay(true);
                checkLoad(false);
            });
        }
    }

    function checkNumFaces(faces) {
        if (faces.length === 1 && sessionStorage.length > 0) {
            canCheck(true);
            canAdd(true);
        } else if (faces.length === 1) {
            canAdd(true);
        }
        if (faces.length > 2) {
            getNumFaces(2);
        } else {
            getNumFaces(faces.length);
        }
    }

    function checkDuplicate() {
        const imgNames = Object.keys(sessionStorage);
        const storedImgs = []
        for (let i = 0; i < imgNames.length; i++) {
            const storedData = JSON.parse(sessionStorage.getItem(imgNames[i]));
            const storedImg = JSON.parse(storedData[1]);
            storedImgs.push(storedImg);
        }
        if (storedImgs.includes(imgSrc)) {
            canAdd(false);
        } else {
            canAdd(true)
        }
    }

    function removeImg() {
        toggleImgDisplay(false);
        toggleFileLoader(true);
        toggleForm(false);
        const form = document.getElementById("fileform");
        form.reset();
        canCheck(false);
        isChecked(false);
        canAdd(false);
    }

    function checkImg() {
        isChecked(true);
        canCheck(false);
        canAdd(false);
        const imgNames = Object.keys(sessionStorage);
        const faceDisplayed = currFace[0];
        const faceMatcher = new faceapi.FaceMatcher(faceDisplayed);
        let faceMatches = {};
        for (let i = 0; i < imgNames.length; i++) {
            const storedData = JSON.parse(sessionStorage.getItem(imgNames[i]));
            const storedFace = JSON.parse(storedData[0]);
            const faceMatch = faceMatcher.matchDescriptor(
                Object.values(storedFace)
            );
            faceMatches[imgNames[i]] = faceMatch.distance;
        }
        let bestMatch = [1];
        for (let matches of Object.keys(faceMatches)) {
            if (faceMatches[matches] < bestMatch[0]) {
                bestMatch[0] = faceMatches[matches];
                bestMatch[1] = matches;
            }
        }
        if (bestMatch[0] <= 0.4) {
            setRetPrompt(`This person is ${bestMatch[1]}`);
        } else {
            setRetPrompt(
                "There is no match to this person. You can add this image to your collection."
            );
            canAdd(true);
        }
    }

    function addImg() {
        if (showForm === true) {
            toggleForm(false);
            checked || sessionStorage.length === 0
                ? canCheck(false)
                : canCheck(true);
        } else {
            toggleForm(true);
            canCheck(false);
        }
    }

    function addImgToStorage(e) {
        e.preventDefault();
        let face = JSON.stringify(currFace[0].descriptor);
        sessionStorage.setItem(
            imgName,
            JSON.stringify([face, JSON.stringify(imgSrc)])
        );
        toggleImgDisplay(false);
        toggleFileLoader(true);
        toggleForm(false);
        const form = document.getElementById("fileform");
        form.reset();
        const nameForm = document.getElementById("personNameForm");
        nameForm.reset();
        canCheck(false);
        canAdd(false);
        isChecked(false);
        setSavedImgs((currImgs) => {
            return [...currImgs, imgName];
        });
    }

    function changeName(props) {
        //setting temp variable
        let tempName = props.target.value;
        if (regexNameInput.test(tempName)) {
            //goes through if the input is in correct format
            setImgName(props.target.value);
            canAddName(true);
        } else {
            //throw an erorr and submit button disabled
            canAddName(false);
        }
    }

    function removeSavedImg(props) {
        setSavedImgs((currImgs) => {
            let currImgsCopy = [...currImgs];
            const index = currImgsCopy.indexOf(props.target.id);
            if (index > -1) {
                currImgsCopy.splice(index, 1);
            }
            return currImgsCopy;
        });
        sessionStorage.removeItem(props.target.id);
    }

    async function getFace(file) {
        const img = await faceapi.bufferToImage(file);
        const detections = await faceapi
            .detectAllFaces(img)
            .withFaceLandmarks()
            .withFaceDescriptors();
        return detections;
    }

    function ImgCards() {
        return (
            <Container
                fluid
                className="text-center justify-content-center d-flex"
            >
                <div className="w-50">
                    <Row className="">
                        {savedImgs.map((image) => {
                            return (
                                <Col
                                    key={uuidv4()}
                                    className="d-flex justify-content-around col-lg-4 col-md-6 col-sm-12"
                                >
                                    <div className="align-items-center my-3">
                                        <Card
                                            style={{
                                                width: "12rem",
                                                height: "17rem",
                                            }}
                                            id="savedImgCards"
                                        >
                                            <Card.Body>
                                                <Card.Title
                                                    className="overflow-auto"
                                                    style={{ height: "2rem" }}
                                                >
                                                    {image}
                                                </Card.Title>
                                                <img
                                                    className="h-50 img-fluid"
                                                    src={JSON.parse(
                                                        JSON.parse(
                                                            sessionStorage.getItem(
                                                                image
                                                            )
                                                        )[1]
                                                    )}
                                                    alt={`An image of ${image}`}
                                                />
                                                <Button
                                                    id={image}
                                                    className="btn-sm btn-danger mt-3"
                                                    onClick={removeSavedImg}
                                                >
                                                    Remove
                                                </Button>
                                            </Card.Body>
                                        </Card>
                                    </div>
                                </Col>
                            );
                        })}
                    </Row>
                </div>
            </Container>
        );
    }

    return (
        <main>
            <h1 className="text-center text-warning mb-5 pt-3" id="title">
                FACE FINDER LOCAL
            </h1>
            <Container
                fluid
                className="text-center border border-warning h-50 w-25 align-items-center d-flex justify-content-center p-0"
                id="imgUploadBox"
            >
                <img
                    src={imgSrc}
                    alt="Image that you have selected"
                    className={`scaled ${showImg ? "d-block" : "d-none"}`}
                    id="uploadedImage"
                />
                <form id="fileform">
                    <input
                        onChange={displayImg}
                        className={`form-control ${
                            showFileLoader ? "d-block" : "d-none"
                        }`}
                        accept="image/png, image/jpg, image/jpeg"
                        type="file"
                        id="formFile"
                    />
                </form>
                <div
                    className={`spinner-border ${
                        isLoading ? "d-block" : "d-none"
                    } text-warning`}
                    role="status"
                ></div>
            </Container>

            <Container
                fluid
                className="d-flex justify-content-center w-50 mt-3"
            >
                <Row>
                    <Col className="d-flex justify-content-center col-lg-3 col-md-12">
                        <button
                            onClick={removeImg}
                            disabled={!showImg}
                            className="btn btn-lg btn-primary text-nowrap mb-3"
                        >
                            Remove Img
                        </button>
                    </Col>
                    <Col className="d-flex justify-content-center col-lg-6 col-md-12">
                        <button
                            onClick={addImg}
                            disabled={!add}
                            className="btn btn-lg btn-secondary text-nowrap mb-3"
                        >
                            Add Img To Collection
                        </button>
                    </Col>
                    <Col className="d-flex justify-content-center col-lg-3 col-md-12">
                        <button
                            onClick={checkImg}
                            disabled={!check}
                            className="btn btn-lg btn-success text-nowrap mb-3"
                        >
                            Check Img
                        </button>
                    </Col>
                </Row>
            </Container>

            <h2
                className={`text-center mt-4 ${
                    !showForm ? "d-block" : "d-none"
                } text-warning`}
            >
                {showImg && !checked
                    ? messages[numFaces]
                    : showImg && checked
                    ? retPrompt
                    : ""}
            </h2>
            <Container
                fluid
                className={`d-flex justify-content-center my-4 w-75 ${
                    showForm ? "d-block" : "d-none"
                }`}
            >
                <Form
                    className="w-50 d-flex justify-content-evenly"
                    id="personNameForm"
                >
                    <Form.Group controlId="formName col-lg-8 col-md-6" className="mx-3">
                        <Form.Control
                            type="text"
                            placeholder="Enter Name of Person"
                            onChange={changeName}
                            data-bs-toggle="tooltip" 
                            title="Use only alphabetical letters"
                        />
                    </Form.Group>
                    <button
                        className="btn btn-warning col-lg-4 col-md-6 mb-3"
                        type="submit"
                        disabled={!addName}
                        onClick={addImgToStorage}
                    >
                        Add Image to Collection
                    </button>
                </Form>
            </Container>
            <ImgCards />
        </main>
    );
}