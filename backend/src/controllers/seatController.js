import {
    listSeats, getSeatById, createSeat, updateSeat, deleteSeat
} from "../services/seatService.js";

export const getAllSeats = async (req, res) =>{
    try{
        const seats = await listSeats();
        res.json(seats);

    }catch( err){
        res.status(500).json({message: err.maessage});

    }
};

export const getSeat = async (req, res) => {
    try{
        const seat = await getSeatById(req.params.id);
        if (!seat) return res.status(404).json({message:'Seat not found '});
        res.json(seat);
    }catch(err){
        res.status(500).json({message: err.message});
    }
};

export const createNewSeat  = async (req, res) =>{
    try{
        const seat = await createSeat(req.body);
        res.status(201).json(seat);
    }catch(err){
        res.status(400).json({message: err.message});
    }
};

export const updateSeatById = async (res, req) =>{
    try{
        const seat = await updateSeat(req.params.id, req.body);
        if (!seat) return res.status(404).json({message: " Seat not found"});
        res.json(seat);
    }catch(err){
        res.status(400).json({message: err.message});
    }
};

export const deleteSeatById = async (req, res) => {
  try {
    const deleted = await deleteSeat(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Seat not found' });
    res.json({ message: 'Seat deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};