import { Component, NgZone } from '@angular/core';
import { NavController, Platform, Events } from 'ionic-angular';

import { BeaconProvider } from '../../providers/beacon-provider';
import { BeaconModel } from '../../models/beacon-model';
import * as AWS from 'aws-sdk';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {
  beacons: BeaconModel[] = [];
  zone: NgZone;
  debug_messages: string;
  device: any;
  topic: string = 'light-control';
  beacon_major: number = 49056;
  beacon_minor: number = 47323;


  constructor(public navCtrl: NavController, public platform: Platform, public beaconProvider: BeaconProvider, public events: Events) {
  	this.debug_messages = "No Debug Message";
    this.zone = new NgZone({ enableLongStackTrace: false });

    console.log(AWS);

    var config = new AWS.Config({
      credentials: new AWS.Credentials({
        accessKeyId: '<key>',
        secretAccessKey: '<keykey>'
      }),
      region: 'us-east-1'
    });

    this.device = new AWS.IotData({
      credentials: config.credentials,
      region: config.region,
      endpoint: 'a1vb512hpb4stb.iot.us-east-1.amazonaws.com'
    });
  }

  sendCommand(command) {
    this.debug_messages = 'sending "' + command +'"';
    this.device.publish(this.getCommand(command), this.handleResult);
  }

  getCommand(command) {
    return { topic: this.topic, payload: this.getMessage(command), qos: 0 };
  }

  getMessage(message) {
    return JSON.stringify({message: message});
  }

  handleResult(err, data) {
    if (err) {
      console.log(err, err.stack);
    } else {
      console.log(data);
    }
  }

  ionViewDidLoad() {
    this.platform.ready().then(() => {
  	  this.debug_messages = "Starting to initialize";

      this.beaconProvider.initialize().then((isInitialized) => {
  	  	this.debug_messages = "initialize complete";

        if (isInitialized) {
          this.listenToBeaconEvents();
        }
      });
    });
  }

  listenToBeaconEvents() {
    this.events.subscribe('didRangeBeaconsInRegion', (data) => {
  	  this.debug_messages = "got the beacons in region event";

      this.zone.run(() => {
        
        let beaconList = data.beacons;
        var knownBeacon : BeaconModel;

        beaconList.forEach((beacon) => {
          var found = false;
          for (let existingBeacon of this.beacons) {
            if (existingBeacon.major === beacon.major && existingBeacon.minor === beacon.minor) {
              existingBeacon.rssi = (existingBeacon.rssi * 4 + beacon.rssi) / 5;
              knownBeacon = existingBeacon;
              found = true;
            }
          }

          if (!found) {
            knownBeacon = new BeaconModel(beacon);
            this.beacons.push(knownBeacon);
          }

          if (this.isBeaconWeCareAbout(knownBeacon)) {
            if (Math.abs(knownBeacon.rssi) < 78) {
              this.sendCommand('on');
            } else {
              this.sendCommand('off');
            }
          }
         });
      });
    });
  }

  isBeaconWeCareAbout(beacon) {
    return beacon.major == this.beacon_major && beacon.minor == this.beacon_minor;
  }
}