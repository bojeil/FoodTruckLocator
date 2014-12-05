"""
Written by Bassam Ojeil
Basic parser for food truck locator
(used mainly to retrieve all time slots associated with a particular food truck)
Requires the installation of the following modules:
pyPdf: http://pybrary.net/pyPdf/
pdfminer: http://www.unixuser.org/~euske/python/pdfminer/
"""
import pyPdf
import json
import urllib2
import tempfile
import pdfminer
import sys
from datetime import datetime
###############################################################
import Queue
import threading
import thread
import time
#http://www.tutorialspoint.com/python/python_multithreading.htm
#extend thread object, customized to process data from queue,
# based on consumer/producer model
#one thread can retrieve job from queue at a time
# on each job completed, thread will pick new job from queue and so on until
# force exit from outside
class myThread (threading.Thread):
    def __init__(self, threadID, name, q):
        threading.Thread.__init__(self)
        self.threadID = threadID
        self.name = name
        self.q = q
    def run(self):
        #print "Starting " + self.name
        process_data(self.name, self.q)
        #print "Exiting " + self.name
        
def process_data(threadName, q):
    while not exitFlag:
        queueLock.acquire()
        if not workQueue.empty():
            data = q.get()
            queueLock.release()
            print threadName+": processing item "+str(data["item_id"])
            processItem(data["myItems"], data["item_id"], data["time_value"])
            #print workQueue.qsize()
        else:
            #print "Queue is empty"
            queueLock.release()
        time.sleep(1)
###############################################################
#parse pdf into html (used for parsing pdf table into html structure)        
#http://zevross.com/blog/2014/04/09/extracting-tabular-data-from-a-pdf-an-example-using-python-and-regular-expressions/
from pdfminer.pdfinterp import PDFResourceManager, PDFPageInterpreter
from pdfminer.converter import HTMLConverter
from pdfminer.converter import TextConverter
from pdfminer.layout import LAParams
from pdfminer.pdfpage import PDFPage
from cStringIO import StringIO
import re
import csv

def convert_pdf_to_html(fp):
    #uses file handle instead of filename (file data already in file pointed to by handle)
    rsrcmgr = PDFResourceManager()
    retstr = StringIO()
    codec = 'utf-8'
    laparams = LAParams()
    device = HTMLConverter(rsrcmgr, retstr, codec=codec, laparams=laparams)
    interpreter = PDFPageInterpreter(rsrcmgr, device)
    password = ""
    maxpages = 0 #is for all
    caching = True
    pagenos=set()
    for page in PDFPage.get_pages(fp, pagenos, maxpages=maxpages, password=password,caching=caching, check_extractable=True):
        interpreter.process_page(page)
    device.close()
    str = retstr.getvalue()
    retstr.close()
    return str
###############################################################

def parseJSON(url):
    #parse url map (sf food truck data) (useful data only) into a dictionary
    myItems = {} #dictionary to hold all food truck data, key is the id of the truck
    response = urllib2.urlopen(url) #send url request
    json_data = response.read() #load data into string (json format)
    try:
        decoded = json.loads(json_data) #decode json data
        
        items = decoded["data"] # get food truck data from json file
        for item in items: #for each truck (item)
            key = item[0] # get id (key)
            myItems[key] = {} # initialize key entry
            myItems[key]["name"] = item[9] #save name
            myItems[key]["type"] = item[19] # save type
            myItems[key]["address"] = item[13] # save address
            myItems[key]["latitude"] = item[22] # save latitude
            myItems[key]["longitude"] = item[23] #save longitude
            myItems[key]["id"] = key # save id
            myItems[key]["facilityType"] = item[10] #save facility type
            myItems[key]["schedule"] = item[24] #save schedule url
            myItems[key]["permitStatus"] = item[18] #save permit status

            #if missing data, remove item from dictionary
            if (myItems[key]["address"] is None) or (myItems[key]["name"] is None) or (myItems[key]["latitude"] is None) or (myItems[key]["longitude"] is None) or (myItems[key]["schedule"] is None):
                del myItems[key]
            
    except (ValueError, KeyError, TypeError):
        print "JSON format error"
    return myItems #return all items

def urlFileHandle(url):
    # create temporary file and load external url content into it,
    # return corresponding file handle
    tf = tempfile.NamedTemporaryFile() 
    response = urllib2.urlopen(url)
    data = response.read()
    tf.write(data)
    return tf
    
def parsePDF(tf):
    #parse pdf pointed to by file handle tf and load all pages into string and return
    #reads data from left right per row (preserves line structure)
    pdf = pyPdf.PdfFileReader(tf)
    content = ""
    for page in pdf.pages:
        content += page.extractText()
    return content

def processItem(myItems, item_id, time_value):
    #processes item in myItems corresponding to item_id, using time_value labels
    #will return true if successful, false otherwise,
    #schedule slots are saved for that item in myItems corresponding to item_id
    #in list accessed the following way:  myItems[item_id]["slots"]
    #if invalid, the whole item is deleted from the myItems dictionary
    #this is an imperfect solution but it gives overall good results, a pdf to csv parser would have been ideal
    
    verbose = False #set to true for debugging to output verbose messages
    #return false if item not found
    if item_id not in myItems:
        if verbose:
            print str(item_id)+" not found!"
        return False
    #get schedule url
    url = myItems[item_id]["schedule"]
    #get address of truck
    address = myItems[item_id]["address"]
    # try to load schedule data and use file handle returned
    try:
        fp = urlFileHandle(url)
    except: #exit if failed to load data
        del myItems[item_id]
        if verbose:
            print sys.exc_info()[0]+": Unable to load url for item "+str(item_id)
        return False

    #get all matches per column (will give us day of week info)
    #save previous cell top location (will be used for long list to compare current top and previous top)
    #if too close to each, will be considered in same horizontal line
    prev_top = 1;
    """
    Each entry has the following structure (most of the time),
    pdf table parsing messy and sometimes structure can be too messy and hard to parse
    For majority of case the structure below works
    <div style="position:absolute; border: textbox 1px solid; writing-mode:lr-tb; left:189px; top:896px; width:40px; height:10px;">
    <span style="font-family: ABCDEE+Tahoma; font-size:10px">50 01ST ST
    <br></span></div>
    """
    address = address.replace(" ","\s+") # allow multiple spaces between address words (for pattern matching later)
    content = convert_pdf_to_html(fp) #convert pdf data to html
    content = re.compile(r'<span[^>]+>').sub('', content) #remove all span opening tags from content
    content = re.compile(r'</span+>').sub('', content) #remove all span closing tags
    content = content.replace("\n","") #remove all new line characters
    content = content.replace("<br>","") #remove all html breaks
    
    slots_day = {} # dictionary, contains the top coordinate (horizontal line identifier) as key and a list of all days (day of week) per line

    #match each cell
    for match in re.finditer(r'left\:(\d+)px;\s+top\:(\d+)px;\s+width\:[\d]+px;\s+height\:[\d]+px;"\>[a-zA-Z\d\/\s]*('+address+')', content, re.I):  
        left = (int)(match.group(1)) #get left coordinate
        top = (int)(match.group(2)) #get top coordinate
        #check if top is close to previous top (implies belong to same line so same top value should be used)
        if abs(float(top)-float(prev_top))/float(prev_top)*100 < 1: #for long document (single time slot could take whole page and each cell in same line could have different y coordinate)
            top = prev_top
        else: #update previous top to current top
            prev_top = top

        #initialize cell day
        day = -1

        #rough estimate, check if left coordinate within certain ranges, and get their corresponding day of week index
        if left< 180: #37
            day = 0 #"Sunday"
        elif left<250: #191
            day = 1 #"Monday"
        elif left<320: #263
            day = 2 #"Tuesday"
        elif left<390:    #335
            day = 3 #"Wednesday"
        elif left<460:    #407
            day = 4 #"Thursday"
        elif left<530:    #479
            day = 5 #"Friday"
        elif left<600:    #551
            day = 6 #"Saturday"

        #if valid day, append to slots_day dictionary using top as key
        if day!=-1:
            if top not in slots_day:
                slots_day[top] = []
            slots_day[top].append(day)   

    # get all matches per row, will give us time info
    # parse data will look like:
    #12PM
    #1 Address1 St
    #1 Address1 St
    #2 Address2 St
    #1PM
    #1 Address1 St
    #2PM....
    #it means 1 Address1 St is in 12PM (2 days of week) and 1PM time slot(1 day of week),
    #data will be parsed from top to bottom (should match above day of week data)
    content = parsePDF(fp) #parse pdf into text
    lines = content.split("\n") #split lines of pdf text
    time = "" #last time field
    slots_time_per_line = [] #time per line, each entry is a line's time slot (for matching addresses only)
    for i in range(0,len(lines)): #traverse text lines top to bottom
        line = lines[i] #current line
        #group multiple lines since addresses can be split among multiple lines
        group_line = line #address on single line
        if i+1<len(lines):
            group_line = group_line+lines[i+1] #address split into 2 lines
            if i+2<len(lines):
                group_line = group_line+lines[i+2] #address split into 3 lines
                if i+3<len(lines):
                    group_line = group_line+lines[i+3] #address split into 4 lines
        
        if line[-2:]=="AM" or line[-2:]=="PM": #if current line is a time slot, save it
            time = str(line).strip()
        elif re.match(r'.*'+address,group_line):# if current group of lines match current address
            if time in time_value: #if valid time
                if len(slots_time_per_line)==0: #if first entry in slots_time_per_line
                    slots_time_per_line.append(time_value[time]) #add corresponding time value to slots_time_per_line
                if slots_time_per_line[len(slots_time_per_line)-1] != time_value[time]: #if new time value (no duplicates), one time slot per line
                    slots_time_per_line.append(time_value[time]) #add it
                    
    i=0 #start at first time in slots_time_per_line
    slots = [] #final list of day/time per item

    #knowing data per line (top to line data) and (time to line data), merge and get day of week and time slot per truck item
    myKeys = slots_day.keys()#sort slots_day keys, so we will iterate top to bottom
    myKeys.sort() #sort top keys in ascending order (smallest is earliest in time)
    force_break = False #when running out of time data, force exit
    for key in myKeys: #traverse results from top to bottom
        if force_break: #if out of time exit
            break
        for day in slots_day[key]: #for each day of week in current line
            
            if len(slots_time_per_line) <= i: #if no time slot, exit (possible error)
                if verbose:
                    print str(item_id)+" data not synchronized!"
                    print "url: "+url
                    print "address: "+address
                force_break = True
                break
            #get slots_time_per_line time entry for current line, add it to slots list
            slots.append({"day":day,"time":slots_time_per_line[i]})
        i = i+1 #increment slots_time_per_line index for next line time slot (corresponds to next key (top) in myKeys)
    fp.close() #close pdf file handle

    myItems[item_id]["slots"] = slots #save slots list for current item
    #if not list, delete entry and return false
    if len(slots)==0: #no data found for current entry, remove
        if verbose:
            print "No schedule found, remove item: "+str(item_id)
        del myItems[item_id]
        return False
    return True   #return true if successful     

#Global variables
startTime = datetime.now() #get start time
TRUCK_DATA_URL = "http://bojeil.github.io/FoodTruckLocator/data.json" #url for food truck data
OUTPUT_FILE = "map.json" #json processed output file filename

myUrl = TRUCK_DATA_URL #url for food truck data
myItems = parseJSON(myUrl) #parse url data and save in myItems dictionary

#translates time string to time value format used in json output
time_value = {}
time_value["12AM"] = "00:00"
time_value["1AM"] = "01:00"
time_value["2AM"] = "02:00"
time_value["3AM"] = "03:00"
time_value["4AM"] = "04:00"
time_value["5AM"] = "05:00"
time_value["6AM"] = "06:00"
time_value["7AM"] = "07:00"
time_value["8AM"] = "08:00"
time_value["9AM"] = "09:00"
time_value["10AM"] = "10:00"
time_value["11AM"] = "11:00"
time_value["12PM"] = "12:00"
time_value["1PM"] = "13:00"
time_value["2PM"] = "14:00"
time_value["3PM"] = "15:00"
time_value["4PM"] = "16:00"
time_value["5PM"] = "17:00"
time_value["6PM"] = "18:00"
time_value["7PM"] = "19:00"
time_value["8PM"] = "20:00"
time_value["9PM"] = "21:00"
time_value["10PM"] = "22:00"
time_value["11PM"] = "23:00"

##### populating data using threading #######
exitFlag = 0 #if zero will force threads to exit
total_threads = 8 #total number of threads running at the same time
queueLock = threading.Lock() #lock for queue (based on producer/consumer model)
workQueue = Queue.Queue(len(myItems)) # queue containing all jobs
threads = [] # list of thread objects

# Create new threads
for threadID in range(1,total_threads+1):
    thread = myThread(threadID, "Thread-"+str(threadID), workQueue)
    thread.start()
    threads.append(thread)
        
# Fill the queue
queueLock.acquire()

for item_id in myItems.keys():
    # save list of data used by each thread for processing
    data = {}
    data["myItems"] = myItems
    data["item_id"] = item_id
    data["time_value"] = time_value
    workQueue.put(data)
queueLock.release()

# Wait for queue to empty
while not workQueue.empty():
    pass

# Notify threads it's time to exit
exitFlag = 1

# Wait for all threads to complete
for t in threads:
    t.join()

##### populating data sequentially #######
"""
count = 0
for item_id in myItems:
    print count
    processItem(myItems, item_id, time_value)
    count = count+1
"""
# save myItems dictionary (which contains parsed time slots) in json format into output file
json_data = json.dumps(myItems, ensure_ascii=True)
fh = open(OUTPUT_FILE,'w')
fh.write(json_data)
fh.close()

print "Duration of script: "+str(datetime.now()-startTime)
