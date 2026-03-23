// ICS Parser - Parse iCalendar format files
class ICSParser {
    static parse(icsContent) {
        const events = [];
        const lines = icsContent.split('\n');
        let currentEvent = null;
        let currentProperty = '';
        
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trimRight();
            
            // Handle line folding (continuation lines)
            while (i + 1 < lines.length && lines[i + 1].match(/^[ \t]/)) {
                i++;
                line += lines[i].substring(1);
            }
            
            if (line === 'BEGIN:VEVENT') {
                currentEvent = {};
                currentProperty = '';
            } else if (line === 'END:VEVENT') {
                if (currentEvent) {
                    events.push(ICSParser.processEvent(currentEvent));
                }
                currentEvent = null;
            } else if (currentEvent !== null) {
                const colonIndex = line.indexOf(':');
                if (colonIndex !== -1) {
                    const property = line.substring(0, colonIndex);
                    const value = line.substring(colonIndex + 1);
                    
                    // Parse property and parameters
                    const propMatch = property.match(/^([A-Z]+)(?:;(.*))?$/);
                    if (propMatch) {
                        const propName = propMatch[1];
                        const params = propMatch[2] ? 
                            ICSParser.parseParams(propMatch[2]) : {};
                        
                        if (currentEvent[propName]) {
                            if (Array.isArray(currentEvent[propName])) {
                                currentEvent[propName].push({ value, params });
                            } else {
                                currentEvent[propName] = [
                                    { value: currentEvent[propName].value, params: currentEvent[propName].params },
                                    { value, params }
                                ];
                            }
                        } else {
                            currentEvent[propName] = { value, params };
                        }
                        currentProperty = propName;
                    }
                }
            }
        }
        
        return events;
    }
    
    static parseParams(paramString) {
        const params = {};
        const paramParts = paramString.split(';');
        
        for (const part of paramParts) {
            const [key, val] = part.split('=');
            if (key && val) {
                params[key.trim()] = val.trim();
            }
        }
        
        return params;
    }
    
    static processEvent(event) {
        return {
            uid: ICSParser.getValue(event.UID),
            summary: ICSParser.getValue(event.SUMMARY),
            dtstart: ICSParser.parseDateTime(event.DTSTART),
            dtend: ICSParser.parseDateTime(event.DTEND),
            location: ICSParser.getValue(event.LOCATION),
            description: ICSParser.getValue(event.DESCRIPTION),
            rrule: ICSParser.getValue(event.RRULE),
            raw: event
        };
    }
    
    static getValue(prop) {
        if (!prop) return '';
        if (typeof prop === 'string') return prop;
        if (prop.value) return prop.value;
        return '';
    }
    
    static parseDateTime(dtProp) {
        if (!dtProp) return null;
        
        const str = ICSParser.getValue(dtProp);
        const params = (typeof dtProp === 'object' && dtProp.params) ? dtProp.params : {};
        
        if (!str) return null;
        
        // Remove any escape characters
        const cleanStr = str.replace(/\\/g, '');
        
        let date;
        
        if (cleanStr.includes('T')) {
            // DateTime format
            const [datePart, timePart] = cleanStr.split('T');
            const year = parseInt(datePart.substring(0, 4));
            const month = parseInt(datePart.substring(4, 6)) - 1;
            const day = parseInt(datePart.substring(6, 8));
            const hour = parseInt(timePart.substring(0, 2));
            const minute = parseInt(timePart.substring(2, 4));
            const second = parseInt(timePart.substring(4, 6)) || 0;
            
            // Handle timezone
            if (params.TZID && params.TZID === 'Asia/Singapore') {
                // Create date in local context and adjust for timezone
                date = new Date(year, month, day, hour, minute, second);
                // Singapore is UTC+8
                const offset = date.getTimezoneOffset();
                const sgOffset = -480; // Singapore UTC offset in minutes
                const adjustedDate = new Date(date.getTime() + (offset - sgOffset) * 60000);
                return adjustedDate;
            } else {
                date = new Date(year, month, day, hour, minute, second);
            }
        } else {
            // Date only format
            const year = parseInt(cleanStr.substring(0, 4));
            const month = parseInt(cleanStr.substring(4, 6)) - 1;
            const day = parseInt(cleanStr.substring(6, 8));
            date = new Date(year, month, day);
        }
        
        return date;
    }
    
    static expandRecurrence(events, until = null) {
        const expandedEvents = [];
        
        for (const event of events) {
            if (!event.rrule) {
                expandedEvents.push(event);
                continue;
            }
            
            // Parse recurrence rule
            const rruleParams = {};
            const rules = event.rrule.split(';');
            
            for (const rule of rules) {
                const [key, value] = rule.split('=');
                rruleParams[key.trim()] = value.trim();
            }
            
            const freq = rruleParams.FREQ;
            const interval = parseInt(rruleParams.INTERVAL) || 1;
            const untilStr = rruleParams.UNTIL;
            const byDay = rruleParams.BYDAY ? rruleParams.BYDAY.split(',') : null;
            
            let untilDate;
            if (untilStr) {
                const year = parseInt(untilStr.substring(0, 4));
                const month = parseInt(untilStr.substring(4, 6)) - 1;
                const day = parseInt(untilStr.substring(6, 8));
                untilDate = new Date(year, month, day);
            } else if (until) {
                untilDate = until;
            } else {
                untilDate = new Date();
                untilDate.setMonth(untilDate.getMonth() + 6); // Default 6 months
            }
            
            // Add original event
            expandedEvents.push(event);
            
            // Generate recurrences
            let currentDate = new Date(event.dtstart);
            const dayMap = {
                'MO': 1, 'TU': 2, 'WE': 3, 'TH': 4,
                'FR': 5, 'SA': 6, 'SU': 0
            };
            
            while (true) {
                let nextDate = new Date(currentDate);
                
                if (freq === 'WEEKLY') {
                    nextDate.setDate(nextDate.getDate() + (7 * interval));
                    
                    // If byDay is specified, find the right day
                    if (byDay) {
                        const dayDiff = currentDate.getDay();
                        for (const bd of byDay) {
                            const targetDay = dayMap[bd];
                            if (targetDay !== undefined) {
                                let adjustDate = new Date(currentDate);
                                adjustDate.setDate(adjustDate.getDate() + (targetDay - dayDiff + 7) % 7 || 7);
                                
                                for (let week = 0; week < interval; week++) {
                                    let occurrenceDate = new Date(adjustDate);
                                    occurrenceDate.setDate(occurrenceDate.getDate() + week * 7);
                                    
                                    if (occurrenceDate > untilDate) break;
                                    if (occurrenceDate > currentDate) {
                                        const newEvent = { ...event };
                                        const duration = event.dtend - event.dtstart;
                                        newEvent.dtstart = new Date(occurrenceDate);
                                        newEvent.dtend = new Date(newEvent.dtstart.getTime() + duration);
                                        expandedEvents.push(newEvent);
                                    }
                                }
                            }
                        }
                        break;
                    }
                } else if (freq === 'DAILY') {
                    nextDate.setDate(nextDate.getDate() + interval);
                }
                
                if (nextDate > untilDate) break;
                if (!byDay) {
                    const duration = event.dtend - event.dtstart;
                    const newEvent = { ...event };
                    newEvent.dtstart = new Date(nextDate);
                    newEvent.dtend = new Date(newEvent.dtstart.getTime() + duration);
                    expandedEvents.push(newEvent);
                    currentDate = nextDate;
                } else {
                    break;
                }
            }
        }
        
        // Sort by start date
        expandedEvents.sort((a, b) => a.dtstart - b.dtstart);
        
        return expandedEvents;
    }
    
    static getWeekLessons(events, weekStart) {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);
        
        return events.filter(event => 
            event.dtstart >= weekStart && event.dtstart < weekEnd
        );
    }
}

// Export for use in browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ICSParser;
}
