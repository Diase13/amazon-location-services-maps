import React, { useState, useEffect } from 'react';
import Card from 'react-bootstrap/Card';
import Container from 'react-bootstrap/Container';
import ListGroup from 'react-bootstrap/ListGroup';
import Navbar from 'react-bootstrap/Navbar';
import awslogo from './awslogo.svg';
import camion from './camion.svg';

import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

import ReactMapGL, { Marker,
   NavigationControl,
} from "react-map-gl";

import "mapbox-gl/dist/mapbox-gl.css"

import Amplify, { Auth } from 'aws-amplify';
import { Signer } from '@aws-amplify/core';
import awsconfig from './aws-exports';

import Location from "aws-sdk/clients/location"

import Pin from './Pin'
import useInterval from './useInterval'

const mapName = "Mapa1";
const indexName = "Prueba"
const trackerName = "Tracker2" 
const deviceID = "Celular"

Amplify.configure(awsconfig);

/**
 * Sign requests made by Mapbox GL using AWS SigV4.
 */
 const transformRequest = (credentials) => (url, resourceType) => {
  // Resolve to an AWS URL
  if (resourceType === "Style" && !url?.includes("://")) {
    url = `https://maps.geo.${awsconfig.aws_project_region}.amazonaws.com/maps/v0/maps/${url}/style-descriptor`;
  }

  // Only sign AWS requests (with the signature as part of the query string)
  if (url?.includes("amazonaws.com")) {
    return {
      url: Signer.signUrl(url, {
        access_key: credentials.accessKeyId,
        secret_key: credentials.secretAccessKey,
        session_token: credentials.sessionToken,
      })
    };
  }

  // Don't sign
  return { url: url || "" };
};

function Search(props){

  const [place, setPlace] = useState('Lima');
 
  const handleChange = (event) => {
    setPlace(event.target.value);
  }

  const handleClick = (event) => {
    event.preventDefault();
    props.searchPlace(place)
  }
  
  return (
    <div className="container">
      <div className="input-group">
        <input type="text" className="form-control form-control-lg" placeholder="Search for Places" aria-label="Place" aria-describedby="basic-addon2" value={ place } onChange={handleChange}/>
        <div className="input-group-append">
          <button onClick={ handleClick } className="btn btn-primary" type="submit">Search</button>
        </div>
      </div>
    </div>
  )
};

function Track(props){
  
  const handleClick = (event) => {
    event.preventDefault();
    props.trackDevice()
  }

  return (
    <div>
      <Navbar bg="dark" variant="dark">
        <Container>
          <Navbar.Brand href="#home">
            <img
              alt=""
              src={awslogo}
              width="30"
              height="30"
              className="d-inline-block align-top"
            />{' '}
            AWS IoT - Rastreador
          </Navbar.Brand>
        </Container>
      </Navbar>
    <div className="container">
      <div className="input-group">
        <div className="input-group-append">
          <br></br>
          <button onClick={ handleClick } className="btn btn-primary" type="submit">Trackear</button>
        </div>
      </div>
    </div>
    </div>
  )
}

const App = () => {

  const [credentials, setCredentials] = useState(null);

  const [viewport, setViewport] = useState({
    longitude: -123.1187,
    latitude: 49.2819,
    zoom: 10,
  });

  const [client, setClient] = useState(null);

  const [marker, setMarker] = useState({
    longitude: -123.1187,
    latitude: 49.2819,
  });

  const [devPosMarkers, setDevPosMarkers] = useState([]); 


  useEffect(() => {
    const fetchCredentials = async () => {
      setCredentials(await Auth.currentUserCredentials());
    };

    fetchCredentials();

    const createClient = async () => {
      const credentials = await Auth.currentCredentials();
      const client = new Location({
          credentials,
          region: awsconfig.aws_project_region,
     });
     setClient(client);
    }

    createClient();  
  }, []);

  useInterval(() => {
    getDevicePosition();
  }, 30000);

  const searchPlace = (place) => {

    const params = {
      IndexName: indexName,
      Text: place,
    };

    client.searchPlaceIndexForText(params, (err, data) => {
      if (err) console.error(err);
      if (data) {
 
        const coordinates = data.Results[0].Place.Geometry.Point;
        setViewport({
          longitude: coordinates[0],
          latitude: coordinates[1], 
          zoom: 10});

        setMarker({
          longitude: coordinates[0],
          latitude: coordinates[1],                 
        })
        return coordinates;
      }
    });
  }


  const getDevicePosition = () => {
    setDevPosMarkers([]);

    var params = {
      DeviceId: deviceID,
      TrackerName: trackerName,
      StartTimeInclusive:"2020-11-02T19:05:07.327Z" ,
      EndTimeExclusive: new Date()
    };

    client.getDevicePositionHistory(params, (err, data) => {
      if (err) console.log(err, err.stack); 
      if (data) { 
        console.log(data)
        const tempPosMarkers =  data.DevicePositions.map( function (devPos, index) {

          return {
            index: index,
            long: devPos.Position[0],
            lat: devPos.Position[1]
          } 
        });

        setDevPosMarkers(tempPosMarkers);

        const pos = tempPosMarkers.length -1;
        
        setViewport({
          longitude: tempPosMarkers[pos].long,
          latitude: tempPosMarkers[pos].lat, 
          zoom: 5});
      }
    });
  }

  const trackerMarkers = React.useMemo(() => devPosMarkers.map(
    pos => (
      <Marker key={pos.index} longitude={pos.long} latitude={pos.lat} >
        <Pin text={pos.index+1} size={20}/>
      </Marker>
    )), [devPosMarkers]);

  return (
    <div className="App">
      <br/>
      <div>
        <Track trackDevice = {getDevicePosition}/>
      </div>
      <br/>
      {credentials ? (
          <ReactMapGL
            {...viewport}
            width="100%"
            height="100vh"
            transformRequest={transformRequest(credentials)}
            mapStyle={mapName}
            onViewportChange={setViewport}
          >
          <div className="sidebar">
            Longitude: {marker.longitude} | Latitude: {marker.latitude} | Zoom: {30}
          </div>
          <Card className="cards">
            <Card.Img variant="top" src={camion} width="100" height="100"/>
            <Card.Body>
              <Card.Title>Camion: Celular</Card.Title>
              <Card.Text>
                Detalles
              </Card.Text>
            </Card.Body>
            <ListGroup className="list-group-flush">
              <ListGroup.Item>Tiempo de espera: 1 hora</ListGroup.Item>
              <ListGroup.Item>Velocidad del camion: 20km/h</ListGroup.Item>
            </ListGroup>
          </Card>
          <Marker
            longitude={marker.longitude}
            latitude={marker.latitude}
            offsetTop={-20}
            offsetLeft={-10}
          > 
            <Pin size={20}/>
            </Marker>

            {trackerMarkers}

            <div style={{ position: "absolute", left: 20, top: 20 }}>
              <NavigationControl showCompass={false} />
            </div>
          </ReactMapGL>
      ) : (
        <h1>Loading...</h1>
      )}
    </div>
  );
};

export default App;