// SQL rows: id, cardID, type (START/STOP), timestamp

/*
- We will read all data from the db and save them to a large object in a "cardName": dataArr[] composition
- If a card contains only one element, and that is a START element then we can set the app to measuring elapsed time, and the button to display STOP
*/

import { Preferences } from '@capacitor/preferences';

/*
async function setObject() {

    var number = 1;

    try{
        const number2 = await Preferences.get({ key: 'number' });

        number = JSON.parse(number2.value).value;

        await Preferences.set({
            key: 'number',
            value: JSON.stringify({"value": (number + 1)})
        });
    }catch{
        await Preferences.set({
            key: 'number',
            value: JSON.stringify({"value": (number)})
        });
    }
    

    await Preferences.set({
            key: 'user' + number.toString(),
            value: JSON.stringify({
            id: number,
            name: 'Max'
        })
    });
}

// JSON "get" example
async function getObject(number) {
    const ret = await Preferences.get({ key: 'user' + number.toString()});
    const user = JSON.parse(ret.value);
    console.log(user);
}

setObject();

let numberStr = await Preferences.get({ key: 'number' });
let number = await JSON.parse(numberStr.value).value;
for (let i = 0; i < number; i++){
    getObject(i);
}
*/

async function saveData(name = "noname", data = []) {

    await Preferences.set({
        key: name,
        value: JSON.stringify(data),
    });
}

async function loadData(name = "noname") {
    const savedData = await Preferences.get({key: name});
    const response = JSON.parse(savedData.value);
    return response;
}

async function getCards () {
    try {
        const data = await loadData("cards");
        return {shifts: data};
    }catch{
        return {shifts: []};
    }
};

// (async() => console.log(await getCards())) ();

document.addEventListener("alpine:init", () => {

    function modifyToHours(millisec) {
        return (millisec / (60 * 60 * 1000)).toFixed(2);
    }

    function dateFromObj(obj) {
        return obj.getFullYear() + "-" + (obj.getMonth() + 1).toString().padStart(2, "0") + "-" + obj.getDate().toString().padStart(2, "0");
    }

    function datetimeFromObj(obj) {
        return obj.getFullYear() + "-" + (obj.getMonth() + 1).toString().padStart(2, "0") + "-" + obj.getDate().toString().padStart(2, "0") + " " + obj.getHours().toString().padStart(2, "0") + ":" + obj.getMinutes().toString().padStart(2, "0") + ":" + obj.getSeconds().toString().padStart(2, "0");
    }

    function fromStringToDate(dateStr){
        const dateISO = dateStr.replace(" ", "T");
        return new Date(dateISO);
    }

    function timeFromObj(obj) {

        const hour = (60 * 60 * 1000);
        const minute = (60 * 1000);
        const second = (1000);

        let hours = 0;
        let minutes = 0;
        let seconds = 0;

        hours = Math.floor(obj / hour);
        obj %= hour;

        minutes = Math.floor(obj / minute);
        obj %= minute;

        seconds = Math.floor(obj / second);
        obj %= second;

        return hours.toString().padStart(2, "0") + ":" + minutes.toString().padStart(2, "0") + ":" + seconds.toString().padStart(2, "0");
    }

    function countAllOverTime(allShifts, shiftLength) {
        var sum = 0;

        var countAllDays = 0;

        let allDates = [];

        for(var i = 0; i < allShifts.length; i += 2){
            const diff = allShifts[i + 1].time - allShifts[i].time;

            sum += diff;

        
            const date1 = new Date(allShifts[i].time);
            const modifiedDate = dateFromObj(date1);
            

            if (!allDates.includes(modifiedDate)) countAllDays++;
            allDates.push(modifiedDate);
        }

        return sum - (60 * 60 * 1000) * (countAllDays * shiftLength);
    }

    Alpine.store('shiftLength', "8");
    var shiftLength = 8;

    Alpine.store("tulora", 0);

    async function setShift (shift) {
        await saveData("savedShift", shift);
        shiftLength = Number(shift);
    }

    (async () => {
        
        try{
            const savedShift = await loadData("savedShift");
            shiftLength = Number(savedShift);
            Alpine.store('shiftLength', savedShift);
        }catch{
            await saveData("savedShift", "8");
        }


        try{
            let savedShifts = (await getCards()).shifts;
        
            if(savedShifts.length % 2 == 0){
                Alpine.store("tulora", modifyToHours(countAllOverTime(savedShifts, shiftLength)));
            } else{
                savedShifts.pop()
                Alpine.store("tulora", modifyToHours(countAllOverTime(savedShifts, shiftLength)));
            }
        }catch{
            Alpine.store("tulora", 0);
        }

    })();

    
    Alpine.data('cards', () => ({
        shifts: [],
        async init() {
            this.shifts = (await getCards()).shifts;
        },

        async addTime() {

            const time = Date.now();

            const type = this.shifts.length > 0 ? this.shifts[this.shifts.length - 1]["type"] == "start" ? "end" : "start" : "start";
            const id = this.shifts.length > 0 ? this.shifts[this.shifts.length - 1]["id"] + 1 : 1;

            const toSave = [...Alpine.raw(this.shifts), {id: id, type: type, time: time}];

            this.shifts = toSave;

            await saveData("cards", toSave);

            // Túlóra
            if (type == "end"){
                
                const sum = modifyToHours(countAllOverTime(toSave, shiftLength))
                Alpine.store("tulora", sum);
            }
            
        },

        displayCards () {
            let finalDeck = [];

            for(let i = 0; i < this.shifts.length; i += 2) {

                let card = [];

                if (i + 1 < this.shifts.length){
                    card = [
                        {...this.shifts[i], time: datetimeFromObj(new Date(this.shifts[i].time))},
                        {...this.shifts[i + 1], time: datetimeFromObj(new Date(this.shifts[i + 1].time))},
                        {
                            cardData1: this.shifts[i].type.toUpperCase() + ': ' + datetimeFromObj(new Date(this.shifts[i].time)), id1: this.shifts[i].id,
                            cardData2: this.shifts[i + 1].type.toUpperCase() + ': ' + datetimeFromObj(new Date(this.shifts[i + 1].time)), id2: this.shifts[i + 1].id,
                        }
                    ];
                }else{
                    card = [
                        {...this.shifts[i], time: datetimeFromObj(new Date(this.shifts[i].time))},
                        {},
                        {
                            cardData1: this.shifts[i].type.toUpperCase() + ': ' + datetimeFromObj(new Date(this.shifts[i].time)), id1: this.shifts[i].id,
                            cardData2: "", id2: null,
                        }
                    ];
                }

                finalDeck.push(card);
            }
            
            return finalDeck.reverse();
        },

        modifyToDate(obj) {
            return obj.getFullYear() + "-" + (obj.getMonth() + 1) + "-" + obj.getDate();
        },

        async deleteCard(deleteArr){
            this.shifts = this.shifts.filter(e => !deleteArr.includes(e.id));

            const toSave = [...Alpine.raw(this.shifts)];
            await saveData("cards", toSave);

            let savedShifts = this.shifts;
        
            if(savedShifts.length % 2 == 0){
                Alpine.store("tulora", modifyToHours(countAllOverTime(savedShifts, shiftLength)));
            } else{
                savedShifts.pop()
                Alpine.store("tulora", modifyToHours(countAllOverTime(savedShifts, shiftLength)));
            }
        },

        async changeDateTime(newDateTime, id){

            const dateArr = newDateTime.split(" ");
            const dateStr = dateArr.slice(1).join(" ");

            const date = fromStringToDate(dateStr);

            this.shifts = this.shifts.map(e => e.id == id ? {...e, time: date.getTime()} : e);

            const toSave = [...Alpine.raw(this.shifts)];
            await saveData("cards", toSave);

            let savedShifts = this.shifts;
        
            if(savedShifts.length % 2 == 0){
                Alpine.store("tulora", modifyToHours(countAllOverTime(savedShifts, shiftLength)));
            } else{
                savedShifts.pop()
                Alpine.store("tulora", modifyToHours(countAllOverTime(savedShifts, shiftLength)));
            }

        } 
    }));

    Alpine.store("timeElapsed", "00:00:00");

    setInterval(async () => {

        const shifts = (await getCards()).shifts;

        const lastCard = shifts[shifts.length - 1];
        const elapsed = new Date(Date.now()) - new Date(lastCard.time);


        const timeElapsed = shifts.length > 0 && lastCard.type !== 'end' ?
            timeFromObj(elapsed) :
            '00:00:00';
        
        Alpine.store("timeElapsed", timeElapsed);

    }, 1000);

    Alpine.store("changeShiftIntervall", {async changeShiftIntervall(shiftLength) {
        setShift(shiftLength);

        try{
            let savedShifts = (await getCards()).shifts;
        
            if(savedShifts.length % 2 == 0){
                Alpine.store("tulora", modifyToHours(countAllOverTime(savedShifts, shiftLength)));
            } else{
                savedShifts.pop()
                Alpine.store("tulora", modifyToHours(countAllOverTime(savedShifts, shiftLength)));
            }
        }catch{
            Alpine.store("tulora", 0);
        }

    }});

    // TODO: változtathatő kezdési és befejező idő, törölhető kártyák

});



