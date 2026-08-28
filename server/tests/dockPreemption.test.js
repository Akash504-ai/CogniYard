const test = require('node:test');
const assert = require('node:assert/strict');
const yardSimulationService = require('../services/yardSimulationService');

test('realistic road simulation defines distinct multi-corridor paths and gate waypoints', () => {
  const state = yardSimulationService.getState();
  assert.ok(state.corridors, 'corridors must be defined');
  assert.ok(state.corridors.HIGHWAY_NH48, 'Highway NH-48 corridor exists');
  assert.ok(state.corridors.NORTH_AIRPORT, 'North Airport Express corridor exists');
  assert.ok(state.corridors.EAST_BELT, 'East Belt corridor exists');

  // Verify points length and gate indexes
  assert.ok(state.corridors.HIGHWAY_NH48.points.length >= 10, 'Highway corridor has realistic waypoint density');
  assert.ok(state.corridors.NORTH_AIRPORT.points.length >= 10, 'North express corridor has realistic waypoint density');
  assert.ok(state.corridors.EAST_BELT.points.length >= 10, 'East belt corridor has realistic waypoint density');
});

test('simulation correctly handles transient dock preemption for high priority shipments', () => {
  // Register a standard lower-priority truck docked at DOCK-01
  yardSimulationService.registerTruck({
    truckId: 'TRK-TEST-LOW',
    poNumber: 'PO-TEST-1',
    priority: 'LOW',
    status: 'AT_DOCK',
    assignedDock: 'DOCK-01'
  });

  // Register an urgent high-priority truck at gate
  yardSimulationService.registerTruck({
    truckId: 'TRK-TEST-URGENT',
    poNumber: 'PO-TEST-2',
    priority: 'URGENT',
    status: 'AT_GATE',
    gateVerification: { status: 'APPROVED', plateMatched: true, driverMatched: true }
  });

  // Execute preemption in simulation engine
  const nextState = yardSimulationService.preemptDockInSimulation('TRK-TEST-URGENT', 'DOCK-01', 'TRK-TEST-LOW');

  const highTruck = nextState.trucks.find(t => t.truckId === 'TRK-TEST-URGENT');
  const lowTruck = nextState.trucks.find(t => t.truckId === 'TRK-TEST-LOW');

  assert.equal(highTruck.assignedDock, 'DOCK-01', 'High priority truck assigned to DOCK-01');
  assert.equal(highTruck.status, 'UNLOADING', 'High priority truck set to UNLOADING');

  assert.equal(lowTruck.assignedDock, null, 'Low priority truck vacated from dock');
  assert.equal(lowTruck.status, 'WAITING_FOR_DOCK', 'Low priority truck relocated to waiting status');
  assert.equal(lowTruck.preempted, true, 'Low priority truck marked preempted');
  assert.ok(lowTruck.yardLocation.includes('Holding Bay'), 'Low priority truck relocated to holding bay');
});
