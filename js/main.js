const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
init();

function init() 
{
    createMonth(currentYearAndMonth());
    updateDate();
    asideEvents(getEvents(new Date(),true));
    toggleMonth();
    toggleDay();
    saveEvent();
    editEvent();
    preventSelection();
    askNotificationPermission();
    checkNextEvents(30);
}

//minutes -> how many minutes to notify before event starts
function checkNextEvents(minutes) 
{
    setInterval(() => 
    {            
        const date = new Date();
        const todayEvents = getEvents(date,true);
        const currentTime = date.getHours() + (date.getMinutes() / 60);             
    
        const eventsStartingSoon = Array.from(todayEvents).filter((element) => 
        {                                                
            const begins = Number(element.begins.split(':')[0]) + Number(element.begins.split(':')[1]/60);   

            //returns events starting in specified minutes             
            return (begins - currentTime > 0) && (begins - currentTime == minutes/60)
        });    

        eventsStartingSoon.forEach(event => notifyEvent(event));    
    }, 1 * 60 * 1000); // check every 1min
}

function askNotificationPermission() 
{
    if (Notification.permission != 'granted') {
        Notification.requestPermission().then(permission => {
            if (permission == 'granted') {
                console.log(`Notifications ${permission}`);                
            }                                            
        })
    }
}

function notifyEvent(event) 
{
    if (Notification.permission != 'granted') {
        askNotificationPermission();
        return;
    }                 
    
    return new Notification(`${event.title} is starting soon`, {
        icon: '../assets/images/calendar.png', 
        body: `Your event starts at ${event.begins}`,
    });   
}

//returns a single event or undefined if not found
function getEventById(id) 
{
    const eventsList = JSON.parse(window.localStorage.getItem('events'));    
    return eventsList.find(event => event.id == id);
}

//fill modal (event) fields to update an event
function fillFields(event) 
{              
    //date fields must be in yyyy-MM-dd format
    if (event.startDate.includes('/'))
        event.startDate = event.startDate.replaceAll('/', '-');

    if (event.endDate.includes('/'))
        event.endDate = event.startDate.replaceAll('/', '-');            

    const form = document.querySelector('#formEvents');

    //contains all event elements, so we don't need to query each one
    const formData = Array.from(form.elements);        

    //fill modal with event information from local storage
    for (let index = 0; index < formData.length; index++) 
    {                        
        formData[index].value = Object.values(event)[index];        
    }                               
}


function editEvent() 
{    
    const events = document.querySelectorAll('li.sidebar__list-item');    

    const activeEvents = Array.from(events).filter(el => 
        el.firstElementChild.classList.contains('sidebar__list-item--complete') == false
    );
            
    activeEvents.forEach(item => {
        item.addEventListener('click', () => {                        
            const eventId = item.getAttribute('data-uid');                                    
            const event = getEventById(eventId);                                   
            fillFields(event);
            $('#eventModal').modal('show');                             
        });
    });
}

function preventSelection() 
{
    document.addEventListener('mousedown', (event) => {
        if (event.detail > 1)
            event.preventDefault();
    }, false);
};

function isEventValid(formData) 
{
    //if any field is left blank, it's invalid
    const blankFields = formData.some((element,index,arr) => {
        return element.value == '';
    });
    
    const begins = Number(formData[4].value.split(':')[0]) + Number(formData[4].value.split(':')[1]/60);
    const ends = Number(formData[5].value.split(':')[0]) + Number(formData[5].value.split(':')[1]/60);

    const startDate = new Date(formData[2].value.replaceAll('-','/'));
    const endDate = new Date(formData[3].value.replaceAll('-','/'));    
    
    return blankFields == false && begins < ends && startDate <= endDate;
}

function saveEvent() 
{    
    const saveBtn = document.querySelector('#btn-save');
    saveBtn.addEventListener('click', () => {        
        const form = document.querySelector('#formEvents');
        const formData = Array.from(form.elements);                                   

        if (!isEventValid(formData)) 
        {
            alert('All fields are required, begin hour must be lower then end hour, start date must be lower then end date');
            return;
        }        
    
        let event = {
            id: formData[0].value == '0' ? uid() : formData[0].value,
            title: formData[1].value,
            startDate: formData[2].value.replaceAll('-','/'),
            endDate: formData[3].value.replaceAll('-','/'),
            begins: formData[4].value,
            ends: formData[5].value,
            people: formData[6].value,
            location: formData[7].value,
            description: formData[8].value,
        };                        
        
        let events = window.localStorage.getItem('events');
        if (events == null) 
        {            
            //array with first event
            events = [event];
            window.localStorage.setItem('events', JSON.stringify(events));
        }
        else
        {
            //array of events
            let eventsArr = JSON.parse(events);

            //if eventId is 0, it's a new event
            if (formData[0].value == '0') 
            {
                eventsArr.push(event);
            }                
            else 
            {                
                //remove event from local storage and add again to update it
                eventsArr.splice(eventsArr.findIndex(element => element.id == event.id),1);                                
                eventsArr.push(event);                
            }
            window.localStorage.setItem('events', JSON.stringify(eventsArr));
        } 
        $('#eventModal').modal('hide');                

        const currentMonth = document.querySelector('#currentMonth').textContent;        
        const month = currentMonth.match(/[a-zA-Z]+/i)[0];            
        const year = parseInt(currentMonth.match(/\d+/)[0]);                
        
        //updates month to display new event(s) created
        createMonth({
            year: year, 
            month: months.indexOf(month)}
        );        

        const currentDay = document.querySelector('#currentDay').textContent;
        const day = parseInt(currentDay.match(/\d+/)[0]);
        
        //updates aside events
        asideEvents(getEvents(new Date(year, months.indexOf(month),day),true));

        //clear modal values if last event was sucessfuly edited                
        formData.forEach((element) => {
            if (element == formData[0]) 
                element.value = 0; //eventId must be zero, not null
            else
                element.value = null;
        });                        
    });
}


function toggleDay() 
{
    const days = document.querySelectorAll('i[name=toggleDay]');

    days.forEach(item => {
        item.addEventListener('click', (event) => {
            const currentMonth = document.querySelector('#currentMonth').textContent;
            const month = currentMonth.match(/[a-zA-Z]+/i)[0];            
            const year = parseInt(currentMonth.match(/\d+/)[0]);            
                        
            const currentDay = document.querySelector('#currentDay').textContent;
            const day = parseInt(currentDay.match(/\d+/)[0]);            

            let targetDay;
            let targetMonth;
        
            if (item.id == 'nextDay') 
            {                
                //check if we increase +1 day or if we increase month and start on the first day of the target month
                targetDay = (day + 1) > daysInMonth(months.indexOf(month) + 1, year) ? 1 : (day + 1);                
                targetMonth = (day + 1) > daysInMonth(months.indexOf(month) + 1, year) ? months.indexOf(month) + 1 == month.length ? months.indexOf('January') : months.indexOf(month) + 1 : months.indexOf(month);
            }
            else
            {                
                //check if we decrease -1 day or if we decrease month and start on the last day of the target month
                targetDay = (day - 1) < 1 ? daysInMonth(months.indexOf(month),year) : (day - 1);
                targetMonth = (day - 1) < 1 ? months.indexOf(month) - 1 < 0 ? months.indexOf('December') : months.indexOf(month) - 1 : months.indexOf(month);
            }
            const targetDate = new Date(year,targetMonth,targetDay);
            targetDay = targetDay < 10 ? `0${targetDay}` : targetDay;
            document.querySelector('#currentDay').textContent = `${targetDay}, ${getDayName(targetDate)}`;                        
            
            //only update month only if necessary
            if (month != targetMonth) 
            {
                document.querySelector('#currentMonth').textContent = `${getMonthName(targetDate)}, ${year}`;            
                createMonth({year: year, month: targetMonth});     
            }
                            
            //update daily aside events
            asideEvents(getEvents(targetDate));  
        });
    });
}

function toggleMonth() 
{
    const arrows = document.querySelectorAll('i[name=toggleMonth]');

    arrows.forEach(item => {
        item.addEventListener('click', (event) => {                 
            const currentDate = document.querySelector('#currentMonth').textContent;
            const month = currentDate.match(/[a-zA-Z]+/i)[0];            
            const year = currentDate.match(/\d+/)[0];            

            let targetYear;
            let targetMonth;                                    

            if (item.id == 'nextMonth') 
            {                                                                
                //if we target december +1, increase +1 year and go back to january
                targetYear = months.indexOf(month) + 1 == months.length ? parseInt(year) + 1 : year; 
                targetMonth = months.indexOf(months) + 1 == months.length ? months.indexOf('January') : months.indexOf(month) + 1;                
            }
            else
            {                
                //if we target january -1, decrease -1 year and -go back to december
                targetYear = months.indexOf(month) - 1 < 0 ? parseInt(year) - 1 : year;                
                targetMonth = months.indexOf(month) - 1 < 0 ? months.indexOf('December') : months.indexOf(month) - 1;
                
            }            
            targetMonth = targetMonth < 10 ? `0${targetMonth}` : targetMonth;

            //next or previous month will always start on day 1
            const targetDate = new Date(targetYear,targetMonth,1);

            document.querySelector('#currentMonth').textContent = `${getMonthName(targetDate)}, ${targetYear}` ;            
            document.querySelector('#currentDay').textContent = `01, ${getDayName(targetDate)}`;                                                

            createMonth({year: targetYear, month: targetMonth});

            //update aside events to the first day of the target month
            asideEvents(getEvents(targetDate));                    
        });
    });    
}

//updates date on screen
function updateDate() 
{
    const date = new Date();
    document.querySelector('#currentMonth').textContent = `${getMonthName(date)}, ${date.getFullYear()}`;    
    document.querySelector('#currentDay').textContent = date.getDate() < 10 ? 
    `0${date.getDate()}, ${getDayName(date)}` : 
    `${date.getDate()}, ${getDayName(date)}`;    
}


function getEvents(date, allDay = false) 
{                
    const eventsList = JSON.parse(window.localStorage.getItem('events'));   
    
    //avoid returning null if no events on storage
    if (eventsList == null) return {};     

    let events;

    //return all events disregarding hour
    if (allDay) 
        events = eventsList.filter(element => 
            new Date(element.startDate).getDate() <= date.getDate() && 
            new Date(element.endDate).getDate() >= date.getDate());
    else
    //filter events between start & end date 
    events = eventsList.filter(element => new Date(element.startDate) <= date && new Date(element.endDate) >= date);
    
    //sort by start time
    return events.sort((a,b) => a.begins.localeCompare(b.begins));
}

//creates aside events structure
function asideEvents(events) 
{    
    //remove previous events if any
    const prevEvents = document.querySelectorAll('li.sidebar__list-item');
    prevEvents.forEach(event => event.parentNode.removeChild(event));            

    //parent to append events
    const ul = document.querySelector('ul.sidebar__list');

    if (events.length > 0) 
    {
        const date = new Date();
               
        for (let index = 0; index < events.length; index++) 
        {
            //anonymous object to check if event has already started
            opts = {
                day: date.getDate(),
                month: date.getMonth(),
                eventBegins: events[index].begins,
                hour: date.getHours(),
                year: date.getFullYear()
            };

            //event
            const li = createElement('li', 'sidebar__list-item')                        
            li.setAttribute('data-uid', `${events[index].id}`);
            if (!eventStarted(opts))
                li.style.cursor = 'pointer';
            ul.appendChild(li);            

            //span 1 (event time)            
            const spanTime = createElement('span', 'list-item__time');            
            if (eventStarted(opts))
                spanTime.classList.add('sidebar__list-item--complete');                            
            const spanTimeTxt = document.createTextNode(events[index].begins);
            spanTime.appendChild(spanTimeTxt);
            li.appendChild(spanTime);

            //span 2 (event title)        
            const spanName = document.createElement('span');
            const spanNameTxt = document.createTextNode(events[index].title);                                            
            if (eventStarted(opts))            
                spanName.classList.add('sidebar__list-item--complete');                            
            spanName.appendChild(spanNameTxt);
            li.appendChild(spanName);                                   
        }
        //adds on click event again since all <li> are deleted at the beginning of the function
        editEvent(); 
    }
    else
    {                
        const li = createElement('li', 'sidebar__list-item', 'text-center')        
        ul.appendChild(li);

        const h3 = createElement('h3', 'lead', 'py-3')                
        const h3Txt = document.createTextNode('No events for this day');
        h3.appendChild(h3Txt);
        li.appendChild(h3);
    }
}

function eventStarted(opts)
{
    const currentMonth = document.querySelector('#currentMonth').textContent;
    const currentDay = document.querySelector('#currentDay').textContent;
    const day = parseInt(currentDay.match(/\d+/)[0]);                
    const month = months.indexOf(currentMonth.match(/[a-zA-Z]+/i)[0]);            
    const year = parseInt(currentMonth.match(/\d+/)[0]);             

    if ((day < opts.day && month <= opts.month && year <= opts.year) || (day <= opts.day && parseInt(opts.eventBegins) <= opts.hour))
        return true;

    return false;
}

function currentYearAndMonth() 
{
    const date = new Date();                
    return {
        year: date.getFullYear(),
        month: date.getMonth(),                                
    };
}

//opts.year: current year
//opts.month: current month
function createMonth(opts) 
{    
    //remove previous month
    const elements = document.querySelectorAll('section.calendar__week');
    elements.forEach(element => element.parentNode.removeChild(element));     

    const totalDays = daysInMonth(parseInt(opts.month) + 1, opts.year);

    //main section to append weeks
    const mainEl = document.querySelector('section.calendar__days');

    let count = 0;
    
    for (let day = 1; day <= totalDays; day+= count) 
    {        
        const initialDay = getDay(opts.year,opts.month,1); 
        
        let infoWeek = {
            year: opts.year,
            month: opts.month,
            start: day, 
            total: totalDays,
        };
                
        if (day == 1 && initialDay >= 2) //tuesday to saturday
            infoWeek.end = (day + 6) - (initialDay - 1);                         
        else if (day == 1 && initialDay == 0) //sunday
            infoWeek.end = 1;
        else
            infoWeek.end = day + 6;                                                    
        
        count = (infoWeek.end - infoWeek.start) + 1;
        const week = createWeek(infoWeek);
        mainEl.appendChild(week);
    }    
}

function createElement(element, ...classNames) 
{    
    const el = document.createElement(element);
    classNames.forEach(className => el.classList.add(className));
    return el;
}

//opts.year: year 
//opts.month: month 
//opts.start: start of the week (number)
//opts.end: end of the week (number)
//opts.total: total days of the month in that week
function createWeek(opts) 
{
    const isFirstWeek = opts.start == 1;
    const isLastWeek = opts.start + 7 > opts.total;    

    //parent section to append 7 calendar days
    const weekEl = createElement('section', 'calendar__week');        
    
    //creates week of the previous month before actual month starts
    if (isFirstWeek) 
    {        
        //check what day the weekend starts 
        const daystoSkip = getDay(opts.year,opts.month,opts.start) > 0 ? (getDay(opts.year,opts.month,opts.start) - 1) : 6;
        
        let daysLastMonth = daysInMonth(parseInt(opts.month), opts.year);        

            for (let day = 1; day <= daystoSkip; day++) 
            {                                       
                const calendarDayEl = calendarDay(false,opts,day, weekEl);                              
                const calendarDateEl = calendarDate(`${daysLastMonth - (daystoSkip - 1)}`,opts,false,calendarDayEl);

                //used to reverse days from previous month
                daysLastMonth++;                                                                
                
                const events = getEvents(new Date(`${opts.year}/${parseInt(opts.month)}/${daysLastMonth - (daystoSkip)}`));                                
                const calendarTaskEl = calendarTask(false,events,calendarDayEl);                  
            }            
    }
    
    //creates week of the current month
    for (let day = opts.start; day <= opts.end; day++) 
    {
        if (day <= opts.total) 
        {                
            const calendarDayEl = calendarDay(true, opts, day,weekEl);
            const calendarDateEl = calendarDate(day,opts,true,calendarDayEl);                                
                                        
            const events = getEvents(new Date(`${opts.year}/${parseInt(opts.month) + 1}/${day}`));                   
            const calendarTaskEl = calendarTask(true,events,calendarDayEl);
        }
    }

    //creates week of the next month after actual month ends
    if (isLastWeek) 
    {
        //number of dates we need to go 'ahead' in inactive
        const daysNextMonth = 7 - ((opts.total - opts.start) + 1);        
                
        for (let day = 0; day < daysNextMonth; day++) 
        {                                     
            const calendarDayEl = calendarDay(false,opts,day,weekEl);                          
            const calendarDateEl = calendarDate(`${day + 1}`,opts,false,calendarDayEl);                        
            
            const events = getEvents(new Date(`${opts.year}/${parseInt(opts.month) + 2}/${day + 1}`));                                                  
            const calendarTaskEl = calendarTask(false,events,calendarDayEl);            
        }
    }
    return weekEl;
}

//creates calendar day structure
//isActive -> true if is not first or last week
function calendarDay(isActive, opts, day,weekElement) 
{    
    const calendarDayEl = createElement('div', 'calendar__day');

    if (isActive) 
    {
        const date = new Date();        
        if (date.getMonth() == opts.month && date.getDate() == day && date.getFullYear() == opts.year)
            calendarDayEl.classList.add('today');
    }
    else     
        calendarDayEl.classList.add('inactive');        
            
    weekElement.appendChild(calendarDayEl);
    return calendarDayEl;
}

//text -> text to insert into the span element created
//calendarDayEl -> parent to append 
function calendarDate(text,opts,isActive,calendarDayEl) 
{    
    const calendarDateEl = createElement('span', 'calendar__date');                  
    const txt = document.createTextNode(text);
    calendarDateEl.appendChild(txt);             
    calendarDayEl.appendChild(calendarDateEl);    

    if (isActive) 
    {
        const currentDayOfTheWeek = new Date(opts.year,opts.month,Number(text)).getDay();
        if (isWeekend(currentDayOfTheWeek))
            calendarDateEl.style.color = '#2fb8c5';
    }    
    return calendarDateEl;
}

function deleteEvent() 
{    
    const eventId = document.querySelector('#eventId').value;        
    const eventsList = JSON.parse(window.localStorage.getItem('events'));    
    const eventsUpdated = eventsList.filter(element => element.id != eventId);
    window.localStorage.setItem('events', JSON.stringify(eventsUpdated));

    $('#eventModal').modal('hide');
    const currentMonth = document.querySelector('#currentMonth').textContent;        
    const month = currentMonth.match(/[a-zA-Z]+/i)[0];            
    const year = parseInt(currentMonth.match(/\d+/)[0]);

    //updates month to not display deleted event(s) 
    createMonth({
        year: year, 
        month: months.indexOf(month)}
    );        

    const currentDay = document.querySelector('#currentDay').textContent;
    const day = parseInt(currentDay.match(/\d+/)[0]);
    
    //updates aside events
    asideEvents(getEvents(new Date(year, months.indexOf(month),day),true));
}

//isActive -> true if is not first or last week
//events -> list of events of a specific date
//calendarDayEl -> parent to append 
function calendarTask(isActive,events,calendarDayEl) 
{    
    const calendarTaskEl = createElement('span', 'calendar__task');

    if (!isActive)                        
        calendarTaskEl.classList.add('inactive');                                    
    
    if (events.length > 0) 
    {
        const text = events.length == 1 ? 'event' : 'events';
        const calendarTaskTxt = document.createTextNode(`${events.length} ${text}`);
        calendarTaskEl.appendChild(calendarTaskTxt);
    }        
    calendarDayEl.appendChild(calendarTaskEl);
    return calendarTaskEl;
}

//January -> 1
//December -> 12
function daysInMonth(month, year) 
{
    return new Date(year, month, 0).getDate();
}

function isWeekend(day) 
{
    return day === 6 || day === 0;
}

function getMonthName(date) 
{    
    return date.toLocaleString('en-US', {month: 'long'})
}

function getDayName(date) 
{
    return date.toLocaleString('en-US', {weekday: 'long'})
}

//return a number that represents the day of the week
//starts at 0 = sunday
function getDay(year, month,day) 
{
    return new Date(year,month,day).getDay();   
}

//generates a random id taking into consideration current time with ms of precision and random numbers
function uid() 
{
    return (performance.now().toString(36)+Math.random().toString(36)).replace(/\./g,"");
};